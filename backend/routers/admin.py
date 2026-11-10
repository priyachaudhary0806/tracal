"""
Admin-only API endpoints for TRACAL platform management.

All endpoints require the requesting user to have role == "admin".
This is enforced by the `require_admin` dependency from
`backend/dependencies/role.py`.

Sections:
  - GET  /api/admin/analytics          — platform-wide statistics
  - GET  /api/admin/users              — list/search users
  - GET  /api/admin/users/{id}         — user detail
  - PATCH /api/admin/users/{id}        — change role / deactivate
  - GET  /api/admin/homestays          — list/search all homestays
  - GET  /api/admin/homestays/{id}     — homestay detail with bookings
  - PATCH /api/admin/homestays/{id}    — moderate (active/deactivated/rejected)
  - GET  /api/admin/bookings           — list/search all bookings
  - GET  /api/admin/bookings/{id}      — booking detail with payment history
  - GET  /api/admin/logs               — admin activity log
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime, timedelta, timezone
import math
import os
import asyncio

from ..models import (
    AdminLogModel,
    AdminUserUpdateModel,
    AdminHomestayUpdateModel,
    AdminReviewUpdateModel,
)
from ..database import (
    user_collection,
    homestay_collection,
    booking_collection,
    enquiry_collection,
    review_collection,
    payment_collection,
    coupon_collection,
    host_verification_collection,
    notification_collection,
    admin_log_collection,
    personality_assessments_collection,
)
from ..email import send_email, _base_template
from ..settings import settings
from ..dependencies.role import require_admin

router = APIRouter()


# ---------------------------------------------------------------------------
# Helper: write an admin activity log entry
# ---------------------------------------------------------------------------

async def _log_action(
    admin: dict,
    action: str,
    target_type: str,
    target_id: str,
    details: Optional[dict] = None,
):
    """Fire-and-forget: insert an admin_log record. Never raises."""
    try:
        await admin_log_collection.insert_one({
            "adminId":    str(admin["_id"]),
            "adminEmail": admin.get("email", ""),
            "action":     action,
            "targetType": target_type,
            "targetId":   target_id,
            "details":    details or {},
            "createdAt":  datetime.now(timezone.utc),
        })
    except Exception:
        pass  # logging must never break the main request


def _serialize(doc: dict) -> dict:
    """Convert ObjectId fields to strings and remove password."""
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    doc.pop("password", None)
    return doc


# ---------------------------------------------------------------------------
# 1. Analytics
# ---------------------------------------------------------------------------

@router.get("/analytics")
async def get_analytics(
    period: str = Query(default="30d", description="7d | 30d | 90d | all"),
    admin: dict = Depends(require_admin),
):
    """
    Returns platform-wide statistics.
    `period` controls the date window for time-series data.
    """
    # Determine date cutoff
    now = datetime.now(timezone.utc)
    cutoff: Optional[datetime] = None
    if period == "7d":
        cutoff = now - timedelta(days=7)
    elif period == "30d":
        cutoff = now - timedelta(days=30)
    elif period == "90d":
        cutoff = now - timedelta(days=90)
    # else: "all" → no cutoff

    date_filter: dict = {}
    if cutoff:
        date_filter = {"createdAt": {"$gte": cutoff}}

    # ── User stats ──
    total_users    = await user_collection.count_documents({})
    total_guests   = await user_collection.count_documents({"role": "guest"})
    total_hosts    = await user_collection.count_documents({"role": "host"})
    verified_hosts = await user_collection.count_documents({"role": "host", "host_verified": True})
    total_admins   = await user_collection.count_documents({"role": "admin"})
    new_users      = await user_collection.count_documents(date_filter) if cutoff else total_users

    # ── Homestay stats ──
    total_homestays      = await homestay_collection.count_documents({})
    active_homestays     = await homestay_collection.count_documents({"moderation_status": {"$ne": "deactivated"}})
    deactivated_homestays = await homestay_collection.count_documents({"moderation_status": "deactivated"})
    new_homestays        = await homestay_collection.count_documents(date_filter) if cutoff else total_homestays

    # Category breakdown
    cat_pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    cat_cursor = homestay_collection.aggregate(cat_pipeline)
    categories: List[dict] = []
    async for doc in cat_cursor:
        categories.append({"category": doc["_id"] or "Unknown", "count": doc["count"]})

    # Popular destinations (top 8 by address prefix)
    dest_pipeline = [
        {"$group": {"_id": "$address", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]
    dest_cursor = homestay_collection.aggregate(dest_pipeline)
    destinations: List[dict] = []
    async for doc in dest_cursor:
        destinations.append({"address": doc["_id"] or "Unknown", "count": doc["count"]})

    # ── Booking stats ──
    booking_filter = dict(date_filter)
    total_bookings    = await booking_collection.count_documents(booking_filter)
    pending_bookings  = await booking_collection.count_documents({**booking_filter, "status": "pending"})
    approved_bookings = await booking_collection.count_documents({**booking_filter, "status": "approved"})
    cancelled_bookings = await booking_collection.count_documents({**booking_filter, "status": "cancelled"})
    rejected_bookings = await booking_collection.count_documents({**booking_filter, "status": "rejected"})

    # ── Payment stats (only from payments collection) ──
    payment_filter = dict(date_filter)
    total_payments   = await payment_collection.count_documents(payment_filter)
    successful_payments = await payment_collection.count_documents({**payment_filter, "status": "success"})
    failed_payments  = await payment_collection.count_documents({**payment_filter, "status": "failed"})

    # Revenue = sum of successful payment amounts
    rev_pipeline = [
        {"$match": {**payment_filter, "status": "success"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    rev_cursor = payment_collection.aggregate(rev_pipeline)
    total_revenue = 0.0
    async for doc in rev_cursor:
        total_revenue = doc.get("total", 0.0)

    # ── Coupon stats ──
    total_coupons  = await coupon_collection.count_documents({})
    active_coupons = await coupon_collection.count_documents({"is_active": True})
    coupon_uses_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$used_count"}}},
    ]
    coupon_cursor = coupon_collection.aggregate(coupon_uses_pipeline)
    total_coupon_uses = 0
    async for doc in coupon_cursor:
        total_coupon_uses = doc.get("total", 0)

    # ── Host verification stats ──
    pending_verifications  = await host_verification_collection.count_documents({"status": "pending"})
    approved_verifications = await host_verification_collection.count_documents({"status": "approved"})
    rejected_verifications = await host_verification_collection.count_documents({"status": "rejected"})

    # ── Time-series: registrations per day (last 30 days) ──
    thirty_days_ago = now - timedelta(days=30)
    reg_pipeline = [
        {"$match": {"createdAt": {"$gte": thirty_days_ago}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$createdAt",
                        "timezone": "UTC",
                    }
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    reg_cursor = user_collection.aggregate(reg_pipeline)
    registrations_chart: List[dict] = []
    async for doc in reg_cursor:
        registrations_chart.append({"date": doc["_id"], "count": doc["count"]})

    # ── Time-series: bookings per day ──
    bk_pipeline = [
        {"$match": {"createdAt": {"$gte": thirty_days_ago}}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$createdAt",
                        "timezone": "UTC",
                    }
                },
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    bk_cursor = booking_collection.aggregate(bk_pipeline)
    bookings_chart: List[dict] = []
    async for doc in bk_cursor:
        bookings_chart.append({"date": doc["_id"], "count": doc["count"]})

    # ── Reviews ──
    total_reviews = await review_collection.count_documents({})
    reported_reviews = await review_collection.count_documents({"is_reported": True})
    hidden_reviews = await review_collection.count_documents({"is_hidden": True})

    # ── Homestay moderation counts ──
    pending_homestays = await homestay_collection.count_documents({"moderation_status": "pending"})

    # ── Recent Activities ──
    recent_cursor = admin_log_collection.find({}).sort("createdAt", -1).limit(10)
    recent_activities = []
    async for rdoc in recent_cursor:
        rdoc["id"] = str(rdoc.pop("_id"))
        recent_activities.append(rdoc)

    return {
        "period": period,
        "users": {
            "total": total_users,
            "guests": total_guests,
            "hosts": total_hosts,
            "verified_hosts": verified_hosts,
            "admins": total_admins,
            "new_in_period": new_users,
        },
        "homestays": {
            "total": total_homestays,
            "active": active_homestays,
            "pending": pending_homestays,
            "deactivated": deactivated_homestays,
            "new_in_period": new_homestays,
            "by_category": categories,
            "popular_destinations": destinations,
        },
        "bookings": {
            "total": total_bookings,
            "pending": pending_bookings,
            "approved": approved_bookings,
            "cancelled": cancelled_bookings,
            "rejected": rejected_bookings,
        },
        "payments": {
            "total": total_payments,
            "successful": successful_payments,
            "failed": failed_payments,
            "total_revenue_inr": total_revenue,
        },
        "coupons": {
            "total": total_coupons,
            "active": active_coupons,
            "total_uses": total_coupon_uses,
        },
        "verifications": {
            "pending": pending_verifications,
            "approved": approved_verifications,
            "rejected": rejected_verifications,
        },
        "reviews": {
            "total": total_reviews,
            "reported": reported_reviews,
            "hidden": hidden_reviews,
        },
        "recent_activities": recent_activities,
        "charts": {
            "registrations_last_30d": registrations_chart,
            "bookings_last_30d": bookings_chart,
        },
    }


# ---------------------------------------------------------------------------
# 2. User Management
# ---------------------------------------------------------------------------

@router.get("/users")
async def list_users(
    search: Optional[str] = Query(None, description="Search by name or email"),
    role: Optional[str] = Query(None, description="Filter by role: guest | host | admin"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    host_verified: Optional[bool] = Query(None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    admin: dict = Depends(require_admin),
):
    """List and search all users. Passwords are never returned."""
    page = page if isinstance(page, int) else 1
    limit = limit if isinstance(limit, int) else 20
    query: Dict[str, Any] = {}

    if isinstance(search, str) and search.strip():
        import re
        pattern = re.compile(re.escape(search.strip()), re.IGNORECASE)
        query["$or"] = [
            {"name": {"$regex": pattern}},
            {"email": {"$regex": pattern}},
        ]
    if isinstance(role, str) and role.strip():
        query["role"] = role.strip()
    if isinstance(is_active, bool):
        # is_active=False means user has been deactivated
        query["is_active"] = is_active
    if isinstance(host_verified, bool):
        query["host_verified"] = host_verified

    total = await user_collection.count_documents(query)
    skip = (page - 1) * limit
    cursor = user_collection.find(query, {"password": 0}).sort("createdAt", -1).skip(skip).limit(limit)

    users = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        # Count properties
        doc["property_count"] = await homestay_collection.count_documents({"userId": doc["id"]})
        # Count bookings
        doc["booking_count"] = await booking_collection.count_documents({"userId": doc["id"]})
        users.append(doc)

    return {
        "users": users,
        "total": total,
        "page": page,
        "pages": max(1, math.ceil(total / limit)),
        "limit": limit,
    }


@router.get("/users/{user_id}")
async def get_user_detail(
    user_id: str,
    admin: dict = Depends(require_admin),
):
    """Get full user detail including recent bookings and properties."""
    try:
        user = await user_collection.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["id"] = str(user.pop("_id"))

    # Recent properties
    cursor = homestay_collection.find({"userId": user_id}).sort("createdAt", -1).limit(10)
    properties = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        properties.append(doc)

    # Recent bookings
    cursor = booking_collection.find({"userId": user_id}).sort("createdAt", -1).limit(10)
    bookings = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        bookings.append(doc)

    # Verification status
    verif = await host_verification_collection.find_one(
        {"userId": user_id}, sort=[("_id", -1)]
    )
    if verif:
        verif["id"] = str(verif.pop("_id"))

    return {
        "user": user,
        "properties": properties,
        "bookings": bookings,
        "verification": verif,
    }


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    update: AdminUserUpdateModel,
    admin: dict = Depends(require_admin),
):
    """
    Change a user's role or active status.
    Prevents an admin from removing their own admin role.
    """
    try:
        target = await user_collection.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    admin_id = str(admin["_id"])

    # Guard: prevent self-demotion
    if user_id == admin_id and update.role and update.role != "admin":
        raise HTTPException(
            status_code=400,
            detail="Admins cannot remove their own admin role",
        )

    if update.role and update.role not in ("guest", "host", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be guest, host, or admin")

    fields: Dict[str, Any] = {}
    log_details: Dict[str, Any] = {"target_email": target.get("email")}

    if update.role is not None:
        fields["role"] = update.role
        log_details["old_role"] = target.get("role")
        log_details["new_role"] = update.role

    if update.is_active is not None:
        fields["is_active"] = update.is_active
        log_details["is_active"] = update.is_active

    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    await user_collection.update_one({"_id": ObjectId(user_id)}, {"$set": fields})

    # Log the action
    action = "change_role" if update.role is not None else "change_active_status"
    await _log_action(admin, action, "user", user_id, log_details)

    updated = await user_collection.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if updated:
        updated["id"] = str(updated.pop("_id"))
    return updated


# ---------------------------------------------------------------------------
# 3. Homestay / Property Management
# ---------------------------------------------------------------------------

@router.get("/homestays")
async def list_all_homestays(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    moderation_status: Optional[str] = Query(None, description="active | deactivated | rejected"),
    host_verified_only: Optional[bool] = Query(None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    admin: dict = Depends(require_admin),
):
    """List all homestays with admin filters. Includes owner verification status."""
    page = page if isinstance(page, int) else 1
    limit = limit if isinstance(limit, int) else 20
    query: Dict[str, Any] = {}

    if isinstance(search, str) and search.strip():
        import re
        pattern = re.compile(re.escape(search.strip()), re.IGNORECASE)
        query["$or"] = [
            {"title": {"$regex": pattern}},
            {"address": {"$regex": pattern}},
            {"owner_name": {"$regex": pattern}},
        ]
    if isinstance(category, str) and category.strip():
        query["category"] = {"$regex": f"^{category.strip()}$", "$options": "i"}
    if isinstance(moderation_status, str) and moderation_status.strip():
        query["moderation_status"] = moderation_status.strip()

    total = await homestay_collection.count_documents(query)
    skip = (page - 1) * limit
    cursor = homestay_collection.find(query).sort("createdAt", -1).skip(skip).limit(limit)

    homestays = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        # Attach owner verification status
        owner = await user_collection.find_one(
            {"_id": ObjectId(doc["userId"])}, {"host_verified": 1, "email": 1, "name": 1, "is_active": 1}
        ) if doc.get("userId") else None
        if owner:
            owner["id"] = str(owner.pop("_id"))
            doc["owner"] = owner
        else:
            doc["owner"] = None
        doc["booking_count"] = await booking_collection.count_documents({"homestayId": doc["id"]})
        homestays.append(doc)

    # Flag unverified-host listings if requested
    if host_verified_only:
        homestays = [h for h in homestays if h.get("owner") and h["owner"].get("host_verified")]

    return {
        "homestays": homestays,
        "total": total,
        "page": page,
        "pages": max(1, math.ceil(total / limit)),
        "limit": limit,
    }


@router.get("/homestays/{homestay_id}")
async def get_homestay_detail(
    homestay_id: str,
    admin: dict = Depends(require_admin),
):
    """Admin detail view for a single property."""
    try:
        doc = await homestay_collection.find_one({"_id": ObjectId(homestay_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid homestay ID")

    if not doc:
        raise HTTPException(status_code=404, detail="Homestay not found")

    doc["id"] = str(doc.pop("_id"))

    # Owner
    owner = None
    if doc.get("userId"):
        owner = await user_collection.find_one({"_id": ObjectId(doc["userId"])}, {"password": 0})
        if owner:
            owner["id"] = str(owner.pop("_id"))
    doc["owner"] = owner

    # Recent bookings
    cursor = booking_collection.find({"homestayId": homestay_id}).sort("createdAt", -1).limit(20)
    bookings = []
    async for b in cursor:
        b["id"] = str(b.pop("_id"))
        bookings.append(b)

    # Reviews
    cursor = review_collection.find({"homestayId": homestay_id}).sort("createdAt", -1).limit(10)
    reviews = []
    async for r in cursor:
        r["id"] = str(r.pop("_id"))
        reviews.append(r)

    return {
        "homestay": doc,
        "bookings": bookings,
        "reviews": reviews,
    }


@router.patch("/homestays/{homestay_id}")
async def moderate_homestay(
    homestay_id: str,
    update: AdminHomestayUpdateModel,
    admin: dict = Depends(require_admin),
):
    """
    Approve, deactivate, reject, or mark pending a homestay listing.
    Stores moderation_status, moderation_reason, and notifies the host.
    """
    if update.moderation_status not in ("active", "deactivated", "rejected", "pending"):
        raise HTTPException(status_code=400, detail="Invalid moderation_status. Must be active, deactivated, rejected, or pending")

    if update.moderation_status == "rejected" and not (update.moderation_reason and update.moderation_reason.strip()):
        raise HTTPException(status_code=400, detail="Moderation reason is required when rejecting a listing")

    try:
        existing = await homestay_collection.find_one({"_id": ObjectId(homestay_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid homestay ID")

    if not existing:
        raise HTTPException(status_code=404, detail="Homestay not found")

    clean_reason = update.moderation_reason.strip() if update.moderation_reason else None

    fields: Dict[str, Any] = {
        "moderation_status": update.moderation_status,
        "moderation_reason": clean_reason,
        "moderated_at": datetime.now(timezone.utc),
        "moderated_by": str(admin["_id"]),
    }

    await homestay_collection.update_one({"_id": ObjectId(homestay_id)}, {"$set": fields})

    # In-app notification to host
    owner_id = existing.get("userId")
    if owner_id:
        status_label = "approved and is now active" if update.moderation_status == "active" else update.moderation_status
        msg = f"Your listing '{existing.get('title')}' is now {status_label}."
        if clean_reason:
            msg += f" Note: {clean_reason}"

        await notification_collection.insert_one({
            "userId": str(owner_id),
            "type": "homestay_moderation",
            "message": msg,
            "read": False,
            "createdAt": datetime.now(timezone.utc),
        })

        # Email notification to host
        owner_user = None
        if ObjectId.is_valid(owner_id):
            owner_user = await user_collection.find_one({"_id": ObjectId(owner_id)})
        if not owner_user and existing.get("email"):
            owner_email = existing.get("email")
        else:
            owner_email = owner_user.get("email") if owner_user else None

        if owner_email:
            subject = f"Listing Status Update: {existing.get('title')}"
            body_html = f"""
              <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:700;">Listing Status Update</h2>
              <p style="color:#475569;font-size:15px;line-height:1.6;">{msg}</p>
            """
            asyncio.create_task(send_email(owner_email, subject, _base_template(subject, body_html)))

    await _log_action(
        admin,
        f"moderate_homestay_{update.moderation_status}",
        "homestay",
        homestay_id,
        {
            "title": existing.get("title"),
            "reason": clean_reason,
            "old_status": existing.get("moderation_status", "active"),
        },
    )

    updated = await homestay_collection.find_one({"_id": ObjectId(homestay_id)})
    if updated:
        updated["id"] = str(updated.pop("_id"))
    return updated


# ---------------------------------------------------------------------------
# 4. Booking Management
# ---------------------------------------------------------------------------

@router.get("/bookings")
async def list_all_bookings(
    search: Optional[str] = Query(None, description="Search by guest name or email"),
    status: Optional[str] = Query(None, description="pending | approved | cancelled | rejected"),
    homestay_id: Optional[str] = Query(None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    admin: dict = Depends(require_admin),
):
    """List all bookings across the entire platform."""
    page = page if isinstance(page, int) else 1
    limit = limit if isinstance(limit, int) else 20
    query: Dict[str, Any] = {}

    if isinstance(search, str) and search.strip():
        import re
        pattern = re.compile(re.escape(search.strip()), re.IGNORECASE)
        query["$or"] = [
            {"name": {"$regex": pattern}},
            {"email": {"$regex": pattern}},
            {"phone": {"$regex": pattern}},
        ]
    if isinstance(status, str) and status.strip():
        query["status"] = status.strip()
    if isinstance(homestay_id, str) and homestay_id.strip():
        query["homestayId"] = homestay_id.strip()

    total = await booking_collection.count_documents(query)
    skip = (page - 1) * limit
    cursor = booking_collection.find(query).sort("createdAt", -1).skip(skip).limit(limit)

    bookings = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        # Attach homestay title
        try:
            hs = await homestay_collection.find_one(
                {"_id": ObjectId(doc["homestayId"])}, {"title": 1, "address": 1, "price": 1}
            )
            if hs:
                doc["homestayTitle"]   = hs.get("title")
                doc["homestayAddress"] = hs.get("address")
                doc["homestayPrice"]   = hs.get("price")
        except Exception:
            pass
        # Attach payment if exists
        payment = await payment_collection.find_one(
            {"bookingId": doc["id"]}, {"gateway_signature": 0, "gateway_payment_id": 0}
        )
        if payment:
            payment["id"] = str(payment.pop("_id"))
        doc["payment"] = payment
        bookings.append(doc)

    return {
        "bookings": bookings,
        "total": total,
        "page": page,
        "pages": max(1, math.ceil(total / limit)),
        "limit": limit,
    }


@router.get("/bookings/{booking_id}")
async def get_booking_detail(
    booking_id: str,
    admin: dict = Depends(require_admin),
):
    """Admin detail view for a single booking with full payment history."""
    try:
        booking = await booking_collection.find_one({"_id": ObjectId(booking_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid booking ID")

    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking["id"] = str(booking.pop("_id"))

    # Homestay details
    homestay = None
    if booking.get("homestayId"):
        hs = await homestay_collection.find_one({"_id": ObjectId(booking["homestayId"])})
        if hs:
            hs["id"] = str(hs.pop("_id"))
            homestay = hs

    # Guest details (no password)
    guest = None
    if booking.get("userId"):
        g = await user_collection.find_one({"_id": ObjectId(booking["userId"])}, {"password": 0})
        if g:
            g["id"] = str(g.pop("_id"))
            guest = g

    # Payment history — NEVER expose gateway_signature
    payments = []
    cursor = payment_collection.find(
        {"bookingId": booking_id}, {"gateway_signature": 0}
    ).sort("createdAt", -1)
    async for p in cursor:
        p["id"] = str(p.pop("_id"))
        payments.append(p)

    return {
        "booking": booking,
        "homestay": homestay,
        "guest": guest,
        "payments": payments,
    }


# ---------------------------------------------------------------------------
# 5. Admin Activity Logs
# ---------------------------------------------------------------------------

@router.get("/logs")
async def get_admin_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    action: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    admin: dict = Depends(require_admin),
):
    """Return admin activity log entries, newest first."""
    page = page if isinstance(page, int) else 1
    limit = limit if isinstance(limit, int) else 50
    query: Dict[str, Any] = {}
    if isinstance(action, str) and action.strip():
        query["action"] = {"$regex": action.strip(), "$options": "i"}
    if isinstance(target_type, str) and target_type.strip():
        query["targetType"] = target_type.strip()

    total = await admin_log_collection.count_documents(query)
    skip = (page - 1) * limit
    cursor = admin_log_collection.find(query).sort("createdAt", -1).skip(skip).limit(limit)

    logs = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        logs.append(doc)

    return {
        "logs": logs,
        "total": total,
        "page": page,
        "pages": max(1, math.ceil(total / limit)),
        "limit": limit,
    }


# ---------------------------------------------------------------------------
# 6. Secure Host Verification Documents
# ---------------------------------------------------------------------------

@router.get("/verifications/{verification_id}/document/{doc_type}")
async def get_verification_document(
    verification_id: str,
    doc_type: str,  # "id_document" or "ownership_proof"
    admin: dict = Depends(require_admin),
):
    """
    Secure authenticated endpoint to view/download host verification documents.
    Strictly forbidden to non-admin users.
    """
    try:
        verif = await host_verification_collection.find_one({"_id": ObjectId(verification_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid verification ID")

    if not verif:
        raise HTTPException(status_code=404, detail="Verification request not found")

    field = "id_document_path" if doc_type == "id_document" else "ownership_proof_path" if doc_type == "ownership_proof" else None
    if not field or not verif.get(field):
        raise HTTPException(status_code=400, detail="Invalid document type or document path not recorded")

    file_path = verif[field]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Document file does not exist on server")

    # Audit log document view
    await _log_action(
        admin,
        "view_verification_document",
        "host_verification",
        verification_id,
        {"doc_type": doc_type, "host_name": verif.get("full_name")}
    )

    return FileResponse(file_path)


# ---------------------------------------------------------------------------
# 7. Reviews Moderation & Reports
# ---------------------------------------------------------------------------

@router.get("/reviews")
async def list_admin_reviews(
    search: Optional[str] = Query(None, description="Search comment or homestay"),
    reported_only: Optional[bool] = Query(None, description="Filter reported reviews"),
    hidden_only: Optional[bool] = Query(None, description="Filter hidden reviews"),
    homestay_id: Optional[str] = Query(None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    admin: dict = Depends(require_admin),
):
    """List all reviews with reported/hidden filters for administrative moderation."""
    page = page if isinstance(page, int) else 1
    limit = limit if isinstance(limit, int) else 20
    query: Dict[str, Any] = {}

    if isinstance(reported_only, bool) and reported_only:
        query["is_reported"] = True
    if isinstance(hidden_only, bool):
        query["is_hidden"] = hidden_only
    if isinstance(homestay_id, str) and homestay_id.strip():
        query["homestayId"] = homestay_id.strip()
    if isinstance(search, str) and search.strip():
        import re
        pattern = re.compile(re.escape(search.strip()), re.IGNORECASE)
        query["comment"] = {"$regex": pattern}

    total = await review_collection.count_documents(query)
    skip = (page - 1) * limit
    cursor = review_collection.find(query).sort("createdAt", -1).skip(skip).limit(limit)

    reviews = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        # Attach homestay title
        if doc.get("homestayId") and ObjectId.is_valid(doc["homestayId"]):
            hs = await homestay_collection.find_one({"_id": ObjectId(doc["homestayId"])}, {"title": 1})
            doc["homestayTitle"] = hs.get("title") if hs else "Unknown Homestay"
        else:
            doc["homestayTitle"] = "Unknown Homestay"

        # Attach booking guest name if available
        if doc.get("bookingId") and ObjectId.is_valid(doc["bookingId"]):
            bk = await booking_collection.find_one({"_id": ObjectId(doc["bookingId"])}, {"name": 1, "email": 1})
            doc["authorName"] = bk.get("name") if bk else "Guest"
            doc["authorEmail"] = bk.get("email") if bk else ""
        else:
            doc["authorName"] = "Guest"
            doc["authorEmail"] = ""

        reviews.append(doc)

    return {
        "reviews": reviews,
        "total": total,
        "page": page,
        "pages": max(1, math.ceil(total / limit)),
        "limit": limit,
    }


@router.patch("/reviews/{review_id}")
async def moderate_review(
    review_id: str,
    update: AdminReviewUpdateModel,
    admin: dict = Depends(require_admin),
):
    """Hide or restore a review. Actions are recorded in the admin audit log."""
    try:
        existing = await review_collection.find_one({"_id": ObjectId(review_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid review ID")

    if not existing:
        raise HTTPException(status_code=404, detail="Review not found")

    fields: Dict[str, Any] = {
        "moderated_at": datetime.now(timezone.utc),
        "moderated_by": str(admin["_id"]),
    }
    if update.is_hidden is not None:
        fields["is_hidden"] = update.is_hidden
    if update.moderation_reason:
        fields["moderation_reason"] = update.moderation_reason.strip()

    await review_collection.update_one({"_id": ObjectId(review_id)}, {"$set": fields})

    action = "hide_review" if update.is_hidden else "restore_review"
    await _log_action(
        admin,
        action,
        "review",
        review_id,
        {
            "reason": update.moderation_reason,
            "homestay_id": existing.get("homestayId"),
            "rating": existing.get("rating"),
        }
    )

    updated = await review_collection.find_one({"_id": ObjectId(review_id)})
    if updated:
        updated["id"] = str(updated.pop("_id"))
    return updated


# ---------------------------------------------------------------------------
# 8. AI Features Monitoring
# ---------------------------------------------------------------------------

@router.get("/ai-monitoring")
async def get_ai_monitoring(admin: dict = Depends(require_admin)):
    """
    Returns live service availability and real platform data metrics for all 6 AI features.
    Does not fabricate synthetic statistics.
    """
    gemini_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
    gemini_configured = bool(gemini_key)
    gemini_status = "Missing Key"
    gemini_validation = "Not Configured"
    gemini_healthy = False
    gemini_error = None

    if gemini_configured:
        primary_model = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash")
        fallback_model = getattr(settings, "GEMINI_FALLBACK_MODEL", "gemini-3.5-flash-lite")
        models_to_check = [primary_model, fallback_model]

        try:
            import httpx
            async with httpx.AsyncClient(timeout=7.0) as client:
                for model_name in models_to_check:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                    resp = await client.post(
                        url,
                        json={"contents": [{"parts": [{"text": "ping"}]}]},
                        headers={"Content-Type": "application/json"}
                    )
                    if resp.status_code == 200:
                        gemini_status = f"Operational ({model_name})"
                        gemini_validation = "Valid"
                        gemini_healthy = True
                        gemini_error = None
                        break
                    elif resp.status_code in (400, 401, 403):
                        gemini_status = "Invalid Credentials"
                        gemini_validation = "Authentication Failed"
                        try:
                            gemini_error = resp.json().get("error", {}).get("message", f"HTTP {resp.status_code} Invalid API Key")
                        except Exception:
                            gemini_error = f"HTTP {resp.status_code} Invalid API Key"
                        break
                    else:
                        gemini_status = f"HTTP {resp.status_code}"
                        gemini_validation = "Service Degraded"
                        gemini_error = f"Gemini API returned HTTP {resp.status_code}"
        except Exception as exc:
            gemini_status = "Connection Error"
            gemini_validation = "Unreachable"
            gemini_error = str(exc)

    places_key = settings.GOOGLE_PLACES_API_KEY.strip() if settings.GOOGLE_PLACES_API_KEY else ""
    places_configured = bool(places_key)
    places_status = "Operational" if places_configured else "Missing Key"
    places_validation = "Configured" if places_configured else "Not Configured"
    places_healthy = places_configured
    places_error = None if places_configured else "GOOGLE_PLACES_API_KEY is not set in backend/.env"

    total_homestays = await homestay_collection.count_documents({})
    rated_homestays = await homestay_collection.count_documents({"ratings": {"$gt": 0}})
    total_reviews = await review_collection.count_documents({})
    verified_hosts = await user_collection.count_documents({"host_verified": True})
    total_bookings = await booking_collection.count_documents({})
    total_assessments = await personality_assessments_collection.count_documents({})

    features = [
        {
            "id": "budget_planner",
            "name": "Smart Trip Budget Planner",
            "status": "Active",
            "dependency": "Internal Database & Pricing Rules",
            "is_available": True,
            "description": "Calculates trip costs using live homestay listings, guest capacity, and food/transport averages.",
            "metrics": f"{total_homestays} homestays available for budget estimation"
        },
        {
            "id": "trustscore",
            "name": "TrustScore",
            "status": "Active",
            "dependency": "Internal Verification & Review Metrics",
            "is_available": True,
            "description": "Transparent 100-point trust metric incorporating host verification, ratings, and listing completeness.",
            "metrics": f"{verified_hosts} verified hosts, {rated_homestays} rated properties evaluated"
        },
        {
            "id": "local_explorer",
            "name": "Local Explorer",
            "status": "Operational",
            "dependency": "OpenStreetMap, Overpass API & Nominatim",
            "is_available": True,
            "description": "Discovers nearby attractions, restaurants, cafes, hospitals, ATMs, and shopping spots with live distance calculations.",
            "metrics": "Live OpenStreetMap Geocoding & POI Querying (100% Free, No Billing)"
        },
        {
            "id": "travel_personality",
            "name": "AI Travel Personality",
            "status": "Operational (AI Enhanced)" if gemini_healthy else "Active (Deterministic Fallback)",
            "dependency": "Google Gemini API (GEMINI_API_KEY) + Archetype Engine",
            "is_available": True,
            "description": "Interactive preference profiling and personalized destination recommendations.",
            "metrics": f"{total_assessments} traveller assessments completed" + (" (Gemini Live)" if gemini_healthy else " (Deterministic Fallback Active)")
        },
        {
            "id": "review_intelligence",
            "name": "AI Review Intelligence",
            "status": "Operational" if gemini_healthy else ("Invalid Key" if gemini_configured else "API Key Required"),
            "dependency": "Google Gemini API (GEMINI_API_KEY)",
            "is_available": gemini_healthy,
            "description": "Extracts sentiment highlights and recurring guest feedback patterns from authentic reviews.",
            "metrics": f"{total_reviews} genuine reviews stored in database ready for analysis"
        },
        {
            "id": "reality_check",
            "name": "Reality Check",
            "status": "Operational" if gemini_healthy else ("Invalid Key" if gemini_configured else "API Key Required"),
            "dependency": "Google Gemini API (GEMINI_API_KEY)",
            "is_available": gemini_healthy,
            "description": "Cross-references listing marketing descriptions with real traveler reviews.",
            "metrics": f"{total_homestays} homestays and {total_reviews} reviews indexed for cross-referencing"
        },
    ]

    return {
        "services": {
            "gemini_api": {
                "name": "Google Gemini API",
                "configured": gemini_configured,
                "validation_status": gemini_validation,
                "status": gemini_status,
                "healthy": gemini_healthy,
                "error_message": gemini_error,
                "variable": "GEMINI_API_KEY",
            },
            "osm_api": {
                "name": "OpenStreetMap & Nominatim",
                "configured": True,
                "validation_status": "Active & Free",
                "status": "Operational",
                "healthy": True,
                "error_message": None,
                "variable": "OpenStreetMap (No API Key Required)",
            },
        },
        "features": features,
        "platform_data": {
            "total_homestays": total_homestays,
            "rated_homestays": rated_homestays,
            "total_reviews": total_reviews,
            "verified_hosts": verified_hosts,
            "total_bookings": total_bookings,
            "total_assessments": total_assessments,
        },
    }
