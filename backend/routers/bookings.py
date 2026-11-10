from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from ..models import BookingModel, BookingResponse
from ..database import booking_collection, homestay_collection, notification_collection, availability_collection
from .deps import get_current_user_id

router = APIRouter()

@router.post("/", response_model=BookingResponse)
async def create_booking(
    booking: BookingModel,
    user_id: str = Depends(get_current_user_id),
):
    """Create a booking. Authentication is required."""
    booking_dict = booking.model_dump()
    booking_dict["userId"] = user_id

    # --- Basic date sanity check ---
    if booking.startDate >= booking.endDate:
        raise HTTPException(status_code=400, detail="Check-out date must be after check-in date")

    # --- Verify homestay exists ---
    try:
        homestay = await homestay_collection.find_one({"_id": ObjectId(booking.homestayId)})
        if not homestay:
            raise HTTPException(status_code=404, detail="Homestay not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid homestay ID")

    # --- Check host blocked dates ---
    # Ensure the requested range does not fall within any blocked date range set by the host.
    blocked = await availability_collection.find_one({
        "homestayId": booking.homestayId,
        "blockedDates": {
            "$elemMatch": {
                "start": {"$lt": booking.endDate},
                "end":   {"$gt": booking.startDate},
            }
        },
    })
    if blocked:
        raise HTTPException(
            status_code=409,
            detail="These dates are blocked by the host. Please select different dates.",
        )

    # --- Date conflict check ---
    # Two date ranges [A, B) and [C, D) overlap when A < D AND C < B.
    # We only block on *approved* bookings; pending requests do not reserve dates.
    conflict = await booking_collection.find_one({
        "homestayId": booking.homestayId,
        "status": "approved",
        "startDate": {"$lt": booking.endDate},
        "endDate":   {"$gt": booking.startDate},
    })
    if conflict:
        raise HTTPException(
            status_code=409,
            detail=(
                "These dates are already booked. "
                "Please choose different check-in or check-out dates."
            ),
        )

    new_booking = await booking_collection.insert_one(booking_dict)
    # Automatic notification: new booking request for host
    # Find homestay to get host userId
    homestay_doc = await homestay_collection.find_one({"_id": ObjectId(booking.homestayId)})
    if homestay_doc:
        await notification_collection.insert_one({
            "userId": homestay_doc.get("userId"),
            "type": "new_booking",
            "message": f"New booking request from {booking.name} for your homestay '{homestay_doc.get('title', '')}'.",
            "read": False,
            "createdAt": datetime.utcnow(),
        })
    created_booking = await booking_collection.find_one({"_id": new_booking.inserted_id})
    created_booking["id"] = str(created_booking["_id"])
    return created_booking

@router.get("/my-trips", response_model=List[dict])
async def get_my_trips(user_id: str = Depends(get_current_user_id)):
    cursor = booking_collection.find({"userId": user_id})
    trips = []
    async for b in cursor:
        b["id"] = str(b["_id"])
        try:
            homestay = await homestay_collection.find_one({"_id": ObjectId(b["homestayId"])})
            if homestay:
                b["homestayTitle"] = homestay.get("title")
                b["homestayImage"] = homestay.get("images", [""])[0] if homestay.get("images") else ""
                b["homestayAddress"] = homestay.get("address")
        except Exception:
            pass
        trips.append(b)
    # Sort by createdAt desc
    trips.sort(key=lambda x: x.get("createdAt", datetime.min), reverse=True)
    return trips

@router.get("/owner", response_model=List[dict])
async def get_owner_reservations(user_id: str = Depends(get_current_user_id)):
    # Find all homestays owned by this user
    cursor = homestay_collection.find({"userId": user_id})
    owned_homestays = {}
    async for h in cursor:
        owned_homestays[str(h["_id"])] = h

    if not owned_homestays:
        return []

    # Find bookings for these homestays
    bookings_cursor = booking_collection.find({"homestayId": {"$in": list(owned_homestays.keys())}})
    reservations = []
    async for b in bookings_cursor:
        b["id"] = str(b["_id"])
        # Attach homestay info
        homestay = owned_homestays.get(b["homestayId"])
        if homestay:
            b["homestayTitle"] = homestay.get("title")
            b["homestayImage"] = homestay.get("images", [""])[0] if homestay.get("images") else ""
            b["homestayAddress"] = homestay.get("address")
        reservations.append(b)
    
    # Sort by createdAt desc
    reservations.sort(key=lambda x: x.get("createdAt", datetime.min), reverse=True)
    return reservations

@router.patch("/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, user_id: str = Depends(get_current_user_id)):
    if status not in ["approved", "rejected", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    try:
        booking = await booking_collection.find_one({"_id": ObjectId(booking_id)})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        # Verify ownership: either the guest cancelled it, or the host approved/rejected it
        homestay = await homestay_collection.find_one({"_id": ObjectId(booking["homestayId"])})
        
        is_guest = booking.get("userId") == user_id
        is_host = homestay and homestay.get("userId") == user_id

        if not (is_guest or is_host):
            raise HTTPException(status_code=403, detail="Not authorized to update this booking")
        
        if is_guest and status != "cancelled":
            raise HTTPException(status_code=400, detail="Guests can only cancel bookings")

        # When a host approves, make sure no other approved booking already covers these dates
        if status == "approved":
            conflict = await booking_collection.find_one({
                "_id":        {"$ne": ObjectId(booking_id)},  # exclude this booking itself
                "homestayId": booking["homestayId"],
                "status":     "approved",
                "startDate":  {"$lt": booking["endDate"]},
                "endDate":    {"$gt": booking["startDate"]},
            })
            if conflict:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Cannot approve: another booking already covers these dates. "
                        "Please reject or cancel the conflicting booking first."
                    ),
                )

        result = await booking_collection.update_one(
            {"_id": ObjectId(booking_id)},
            {"$set": {"status": status}}
        )
        if result.modified_count == 1:
            return {"message": f"Booking status updated to {status}"}
        
        return {"message": "Status was already set to " + status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
