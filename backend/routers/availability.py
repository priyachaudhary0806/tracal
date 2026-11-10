from fastapi import APIRouter, HTTPException, Depends
from typing import List
from bson import ObjectId
from datetime import datetime

from ..models import (
    AvailabilityModel,
    AvailabilityResponse,
    AvailabilityBlockedRange,
)
from ..database import availability_collection, booking_collection, homestay_collection
from .deps import get_current_user_id

router = APIRouter()

# Helper to check overlap between two date ranges [a_start, a_end) and [b_start, b_end)
def _overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and b_start < a_end

@router.get("/{homestay_id}/availability", response_model=AvailabilityResponse)
async def get_availability(homestay_id: str, user_id: str = Depends(get_current_user_id)):
    # Anyone can view availability, but we keep auth optional for consistency
    doc = await availability_collection.find_one({"homestayId": homestay_id})
    if not doc:
        # Return empty model if none exists
        return {"id": "", "homestayId": homestay_id, "blockedDates": []}
    doc["id"] = str(doc.get("_id"))
    return doc

@router.post("/{homestay_id}/availability/block", response_model=AvailabilityResponse)
async def block_dates(
    homestay_id: str,
    range: AvailabilityBlockedRange,
    user_id: str = Depends(get_current_user_id),
):
    # Verify host ownership
    homestay = await homestay_collection.find_one({"_id": ObjectId(homestay_id)})
    if not homestay:
        raise HTTPException(status_code=404, detail="Homestay not found")
    if homestay.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Only the property owner can modify availability")
    # Validate range
    if range.start >= range.end:
        raise HTTPException(status_code=400, detail="Start date must be before end date")
    # Ensure no approved booking overlaps the block
    conflict = await booking_collection.find_one({
        "homestayId": homestay_id,
        "status": "approved",
        "startDate": {"$lt": range.end},
        "endDate": {"$gt": range.start},
    })
    if conflict:
        raise HTTPException(
            status_code=409,
            detail="Cannot block dates that overlap an approved booking",
        )
    # Ensure the block does not duplicate an existing block (exact same range)
    existing = await availability_collection.find_one({
        "homestayId": homestay_id,
        "blockedDates": {
            "$elemMatch": {"start": range.start, "end": range.end}
        },
    })
    if existing:
        raise HTTPException(status_code=400, detail="Date range already blocked")
    # Add to blockedDates array (create document if missing)
    await availability_collection.update_one(
        {"homestayId": homestay_id},
        {"$push": {"blockedDates": {"start": range.start, "end": range.end}}},
        upsert=True,
    )
    # Return updated doc
    doc = await availability_collection.find_one({"homestayId": homestay_id})
    doc["id"] = str(doc.get("_id"))
    return doc

@router.post("/{homestay_id}/availability/unblock", response_model=AvailabilityResponse)
async def unblock_dates(
    homestay_id: str,
    range: AvailabilityBlockedRange,
    user_id: str = Depends(get_current_user_id),
):
    homestay = await homestay_collection.find_one({"_id": ObjectId(homestay_id)})
    if not homestay:
        raise HTTPException(status_code=404, detail="Homestay not found")
    if homestay.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Only the property owner can modify availability")
    # Pull matching range
    result = await availability_collection.update_one(
        {"homestayId": homestay_id},
        {"$pull": {"blockedDates": {"start": range.start, "end": range.end}}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Blocked date range not found")
    doc = await availability_collection.find_one({"homestayId": homestay_id})
    if doc:
        doc["id"] = str(doc.get("_id"))
        return doc
    else:
        return {"id": "", "homestayId": homestay_id, "blockedDates": []}

@router.post("/{homestay_id}/availability/check", response_model=dict)
async def check_availability(
    homestay_id: str,
    range: AvailabilityBlockedRange,
):
    # Returns {available: bool, reason?: str}
    if range.start >= range.end:
        return {"available": False, "reason": "Invalid date range"}
    # Check blocked dates
    blocked = await availability_collection.find_one({
        "homestayId": homestay_id,
        "blockedDates": {
            "$elemMatch": {
                "start": {"$lt": range.end},
                "end": {"$gt": range.start},
            }
        },
    })
    if blocked:
        return {"available": False, "reason": "Dates are blocked by the host"}
    # Check approved bookings
    conflict = await booking_collection.find_one({
        "homestayId": homestay_id,
        "status": "approved",
        "startDate": {"$lt": range.end},
        "endDate": {"$gt": range.start},
    })
    if conflict:
        return {"available": False, "reason": "Dates already booked"}
    return {"available": True}

