from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from bson import ObjectId
from datetime import datetime

from ..models import ReviewModel, ReviewResponse, HomestayModel, HomestayResponse, ReportReviewPayload
from ..database import review_collection, homestay_collection, booking_collection
from .deps import get_current_user_id

router = APIRouter()

def _recalculate_homestay_rating(homestay_id: str):
    """Aggregate reviews for a homestay and update its `ratings` field.
    Also store `reviewCount` for convenience (adds field if missing)."""
    pipeline = [
        {"$match": {"homestayId": homestay_id}},
        {"$group": {"_id": "$homestayId", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    agg = review_collection.aggregate(pipeline)
    async def _update(avg: float, count: int):
        await homestay_collection.update_one({"_id": ObjectId(homestay_id)}, {"$set": {"ratings": avg, "reviewCount": count}})
    # Since Motor's aggregate returns an AsyncIOMotorCommandCursor, we need to iterate
    async def _run():
        async for doc in agg:
            await _update(doc.get("avg", 0.0), doc.get("count", 0))
        # If there are no reviews, clear rating/count
        if agg._cursor_id == 0:  # no docs returned
            await homestay_collection.update_one({"_id": ObjectId(homestay_id)}, {"$set": {"ratings": 0.0, "reviewCount": 0}})
    # Fire-and-forget – schedule the task
    # In this context we can simply await
    import asyncio
    asyncio.create_task(_run())

@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(review: ReviewModel, user_id: str = Depends(get_current_user_id)):
    # Verify booking belongs to user and is eligible
    booking = await booking_collection.find_one({"_id": ObjectId(review.bookingId)})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Cannot review a booking you do not own")
    if booking.get("status") != "approved":
        raise HTTPException(status_code=400, detail="Only approved bookings can be reviewed")
    if booking.get("endDate") > datetime.utcnow():
        raise HTTPException(status_code=400, detail="Cannot review before stay is completed")
    # Prevent duplicate review for same booking
    existing = await review_collection.find_one({"bookingId": review.bookingId})
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this booking")
    # Insert review
    review_dict = review.model_dump()
    review_dict["createdAt"] = datetime.utcnow()
    new_rev = await review_collection.insert_one(review_dict)
    created = await review_collection.find_one({"_id": new_rev.inserted_id})
    created["id"] = str(created["_id"])
    # Recalculate rating for homestay (async, fire-and-forget)
    _recalculate_homestay_rating(review.homestayId)
    return created

@router.get("/{homestay_id}", response_model=List[ReviewResponse])
async def get_reviews_for_homestay(homestay_id: str, skip: int = 0, limit: int = 20):
    # Exclude reviews hidden by administrators
    cursor = (
        review_collection.find({"homestayId": homestay_id, "is_hidden": {"$ne": True}})
        .skip(skip)
        .limit(limit)
        .sort("createdAt", -1)
    )
    reviews = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        reviews.append(doc)
    return reviews

@router.post("/{review_id}/report")
async def report_review(
    review_id: str,
    payload: ReportReviewPayload,
    user_id: str = Depends(get_current_user_id),
):
    """Allows guests/hosts to report an inappropriate or suspicious review to administrators."""
    try:
        review = await review_collection.find_one({"_id": ObjectId(review_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid review ID")

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    reason = payload.reason.strip() if payload.reason else ""
    if not reason:
        raise HTTPException(status_code=400, detail="Report reason is required")

    await review_collection.update_one(
        {"_id": ObjectId(review_id)},
        {
            "$set": {
                "is_reported": True,
                "report_reason": reason,
                "reported_at": datetime.utcnow(),
                "reported_by": user_id,
            }
        },
    )
    return {"message": "Review reported successfully. Our administration team will review it."}

@router.patch("/{review_id}/host-response", response_model=ReviewResponse)
async def host_respond(review_id: str, response: str, user_id: str = Depends(get_current_user_id)):
    # Find review and related homestay
    review = await review_collection.find_one({"_id": ObjectId(review_id)})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    homestay = await homestay_collection.find_one({"_id": ObjectId(review["homestayId"])})
    if not homestay:
        raise HTTPException(status_code=404, detail="Homestay not found")
    if homestay.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Only the host can respond to reviews")
    await review_collection.update_one({"_id": ObjectId(review_id)}, {"$set": {"hostResponse": response}})
    updated = await review_collection.find_one({"_id": ObjectId(review_id)})
    updated["id"] = str(updated["_id"])
    return updated

