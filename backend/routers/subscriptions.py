from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from bson import ObjectId

from ..models import (
    CreateOrderPayload,
    VerifyPayload,
    SubscriptionResponse,
    SubscriptionStatus,
    PlanEnum,
)
from ..database import subscription_collection, user_collection
from ..routers.deps import get_current_user_id
from ..utils.razorpay_client import create_order, verify_signature, fetch_payment
from ..settings import settings

router = APIRouter()

# Helper to compute expiry based on plan
def _expiry_for_plan(plan: PlanEnum) -> datetime:
    now = datetime.utcnow()
    if plan == PlanEnum.PRO_MONTHLY:
        return now + timedelta(days=30)
    if plan == PlanEnum.PRO_QUARTERLY:
        return now + timedelta(days=90)
    if plan == PlanEnum.PREMIUM_YEARLY:
        return now + timedelta(days=365)
    # default fallback
    return now

@router.post("/create-order", response_model=SubscriptionResponse)
async def create_subscription_order(payload: CreateOrderPayload, user_id: str = Depends(get_current_user_id)):
    # Validate plan exists in settings prices
    plan_price = settings.PLAN_PRICES.get(payload.plan.value)
    if plan_price is None:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
    # Insert a pending subscription document
    sub_doc = {
        "userId": user_id,
        "plan": payload.plan.value,
        "status": SubscriptionStatus.PENDING.value,
        "createdAt": datetime.utcnow(),
    }
    result = await subscription_collection.insert_one(sub_doc)
    sub_id = str(result.inserted_id)
    # Create Razorpay order – amount is in rupees (price from settings)
    order = create_order(amount_rupees=plan_price, receipt=sub_id)
    # Update document with Razorpay order id
    await subscription_collection.update_one({"_id": ObjectId(sub_id)}, {"$set": {"orderId": order["id"]}})
    # Return response
    return SubscriptionResponse(
        id=sub_id,
        plan=payload.plan,
        status=SubscriptionStatus.PENDING,
        orderId=order["id"],
        paymentId=None,
        expiresAt=None,
    )

@router.post("/verify", response_model=SubscriptionResponse)
async def verify_subscription(payload: VerifyPayload, user_id: str = Depends(get_current_user_id)):
    # Find pending subscription for this user matching given order_id
    sub_doc = await subscription_collection.find_one({
        "userId": user_id,
        "orderId": payload.razorpay_order_id,
        "status": SubscriptionStatus.PENDING.value,
    })
    if not sub_doc:
        raise HTTPException(status_code=400, detail="No matching pending subscription")
    # Verify signature
    if not verify_signature(payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid Razorpay signature")
    # Fetch payment from Razorpay for server‑side validation
    payment = fetch_payment(payload.razorpay_payment_id)
    # Validate status, currency, amount
    expected_price = settings.PLAN_PRICES.get(sub_doc["plan"])
    if payment.get("status") != "captured":
        raise HTTPException(status_code=400, detail="Payment not captured")
    if payment.get("currency") != "INR":
        raise HTTPException(status_code=400, detail="Unsupported currency")
    # Razorpay amount is in paise
    if payment.get("amount") != expected_price * 100:
        raise HTTPException(status_code=400, detail="Payment amount mismatch")
    # Atomic activation – ensure we only activate once
    update_res = await subscription_collection.find_one_and_update(
        {
            "_id": sub_doc["_id"],
            "status": SubscriptionStatus.PENDING.value,
            "paymentId": None,
        },
        {
            "$set": {
                "status": SubscriptionStatus.ACTIVE.value,
                "paymentId": payload.razorpay_payment_id,
                "signature": payload.razorpay_signature,
                "expiresAt": _expiry_for_plan(PlanEnum(sub_doc["plan"])),
            }
        },
        return_document=False,
    )
    if not update_res:
        raise HTTPException(status_code=409, detail="Subscription already processed")
    # Update user document to reference active subscription (optional field)
    await user_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"subscription_id": str(sub_doc["_id"])}})
    # Return updated subscription
    sub_doc["status"] = SubscriptionStatus.ACTIVE.value
    sub_doc["paymentId"] = payload.razorpay_payment_id
    sub_doc["signature"] = payload.razorpay_signature
    sub_doc["expiresAt"] = _expiry_for_plan(PlanEnum(sub_doc["plan"]))
    sub_doc["id"] = str(sub_doc["_id"])
    return SubscriptionResponse(
        id=sub_doc["id"],
        plan=PlanEnum(sub_doc["plan"]),
        status=SubscriptionStatus.ACTIVE,
        orderId=sub_doc.get("orderId"),
        paymentId=sub_doc.get("paymentId"),
        expiresAt=sub_doc.get("expiresAt"),
    )

@router.get("/me", response_model=SubscriptionResponse)
async def get_my_subscription(user_id: str = Depends(get_current_user_id)):
    sub_doc = await subscription_collection.find_one({"userId": user_id, "status": {"$in": [SubscriptionStatus.ACTIVE.value, SubscriptionStatus.PENDING.value]}})
    if not sub_doc:
        # Return a Free plan placeholder
        return SubscriptionResponse(
            id="",
            plan=PlanEnum.PRO_MONTHLY,  # placeholder, UI will treat as FREE based on status
            status=SubscriptionStatus.EXPIRED,
            orderId=None,
            paymentId=None,
            expiresAt=None,
        )
    # Auto‑expire if past expiry
    if sub_doc.get("expiresAt") and sub_doc["expiresAt"] < datetime.utcnow():
        await subscription_collection.update_one({"_id": sub_doc["_id"]}, {"$set": {"status": SubscriptionStatus.EXPIRED.value}})
        sub_doc["status"] = SubscriptionStatus.EXPIRED.value
    sub_doc["id"] = str(sub_doc["_id"])
    return SubscriptionResponse(
        id=sub_doc["id"],
        plan=PlanEnum(sub_doc["plan"]),
        status=SubscriptionStatus(sub_doc["status"]),
        orderId=sub_doc.get("orderId"),
        paymentId=sub_doc.get("paymentId"),
        expiresAt=sub_doc.get("expiresAt"),
    )

@router.get("/history", response_model=list[SubscriptionResponse])
async def subscription_history(user_id: str = Depends(get_current_user_id)):
    cursor = subscription_collection.find({"userId": user_id}).sort("createdAt", -1)
    history = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        history.append(
            SubscriptionResponse(
                id=doc["id"],
                plan=PlanEnum(doc["plan"]),
                status=SubscriptionStatus(doc["status"]),
                orderId=doc.get("orderId"),
                paymentId=doc.get("paymentId"),
                expiresAt=doc.get("expiresAt"),
            )
        )
    return history

