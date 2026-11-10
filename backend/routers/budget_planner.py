from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import List, Dict, Any, Optional
from ..models import BudgetRequest, BudgetResponse, ComponentEstimate
from ..database import homestay_collection, user_collection
from ..routers.deps import get_current_user_id
from ..services.feature_access import check_feature_access, AI_FEATURE_BUDGET_PLANNER
from bson import ObjectId

router = APIRouter()

FOOD_COST_PER_PERSON_PER_DAY = 500  # INR
TRANSPORT_COST_PER_PERSON_PER_DAY = 300  # INR

@router.post("/calculate", response_model=BudgetResponse)
async def calculate_budget(request: BudgetRequest, current_user_id: str = Depends(get_current_user_id)):
    # Validate access (100% free for all registered users in current phase)
    user = await user_collection.find_one({"_id": ObjectId(current_user_id)}) if ObjectId.is_valid(current_user_id) else None
    if not check_feature_access(user, AI_FEATURE_BUDGET_PLANNER):
        raise HTTPException(status_code=403, detail="Budget Planner feature access restricted")

    # Validate dates
    if request.end_date <= request.start_date:
        raise HTTPException(status_code=400, detail="Check-out date must be after check-in date")
    nights = (request.end_date - request.start_date).days
    if nights <= 0:
        raise HTTPException(status_code=400, detail="Trip duration must be at least one night")
    if request.travellers <= 0:
        raise HTTPException(status_code=400, detail="Number of travellers must be at least 1")

    # Food & transport estimates
    food_est = request.travellers * nights * FOOD_COST_PER_PERSON_PER_DAY
    transport_est = request.travellers * nights * TRANSPORT_COST_PER_PERSON_PER_DAY

    # Search for homestays matching destination & capacity
    guest_filter = {
        "$or": [
            {"guestCount": {"$gte": request.travellers}},
            {"guestCount": None},
            {"guestCount": {"$exists": False}},
        ]
    }
    
    dest_clean = request.destination.strip()
    primary_query = {
        "$and": [
            guest_filter,
            {
                "$or": [
                    {"address": {"$regex": dest_clean, "$options": "i"}},
                    {"title": {"$regex": dest_clean, "$options": "i"}},
                ]
            },
            {"moderation_status": {"$ne": "rejected"}},
        ]
    }

    cursor = homestay_collection.find(primary_query).sort("price", 1)
    homestays = []
    async for doc in cursor:
        homestays.append({
            "id": str(doc["_id"]),
            "title": doc.get("title", ""),
            "address": doc.get("address", ""),
            "price": doc.get("price", 0),
            "guestCount": doc.get("guestCount", request.travellers),
            "images": doc.get("images", []),
        })

    is_fallback = False
    # If no homestays in exact destination, fall back to affordable homestays across TRACAL
    if not homestays:
        is_fallback = True
        fallback_query = {
            "$and": [
                guest_filter,
                {"moderation_status": {"$ne": "rejected"}},
            ]
        }
        fallback_cursor = homestay_collection.find(fallback_query).sort("price", 1).limit(6)
        async for doc in fallback_cursor:
            homestays.append({
                "id": str(doc["_id"]),
                "title": doc.get("title", ""),
                "address": doc.get("address", ""),
                "price": doc.get("price", 0),
                "guestCount": doc.get("guestCount", request.travellers),
                "images": doc.get("images", []),
            })

    if not homestays:
        raise HTTPException(status_code=404, detail="No active homestays currently available on the platform.")

    # Select best value / cheapest homestay
    cheapest = homestays[0]
    accommodation_est = cheapest["price"] * nights

    # Total estimated cost
    total_estimated = accommodation_est + food_est + transport_est

    # Activities budget is whatever remains
    remaining_budget = request.total_budget - total_estimated
    activities_est = max(0, remaining_budget)

    shortfall = None
    suggestions = []
    if remaining_budget < 0:
        shortfall = -remaining_budget
        message = f"Estimated trip cost (₹{total_estimated}) exceeds your budget by ₹{shortfall}. Consider reducing group size or choosing an alternative homestay."
    else:
        message = f"Great news! Your estimated trip budget fits comfortably within ₹{request.total_budget}."

    if is_fallback:
        message = f"No direct homestay matches in '{request.destination}'. Showing top affordable homestays across India for your group. " + message

    # Alternatives
    if len(homestays) > 1:
        suggestions = [
            {
                "id": alt["id"],
                "title": alt["title"],
                "address": alt["address"],
                "price_per_night": alt["price"],
                "total_accommodation": alt["price"] * nights,
            }
            for alt in homestays[1:5]
        ]

    return BudgetResponse(
        accommodation=ComponentEstimate(
            estimate=accommodation_est,
            details=f"{cheapest['title']} (₹{cheapest['price']}/night × {nights} night{'s' if nights > 1 else ''})"
        ),
        food=ComponentEstimate(
            estimate=food_est,
            details=f"₹{FOOD_COST_PER_PERSON_PER_DAY}/person/day for {request.travellers} traveller{'s' if request.travellers > 1 else ''}"
        ),
        transport=ComponentEstimate(
            estimate=transport_est,
            details=f"₹{TRANSPORT_COST_PER_PERSON_PER_DAY}/person/day for {request.travellers} traveller{'s' if request.travellers > 1 else ''}"
        ),
        activities=ComponentEstimate(
            estimate=activities_est,
            details="Remaining flexible budget for sightseeing, local events & shopping"
        ),
        total_estimated=total_estimated + activities_est,
        shortfall=shortfall,
        message=message,
        suggestions=suggestions,
        destination=request.destination,
        nights=nights,
        travellers=request.travellers,
        recommended_homestay={
            "id": cheapest["id"],
            "title": cheapest["title"],
            "address": cheapest["address"],
            "price": cheapest["price"],
            "images": cheapest.get("images", [])[:1],
        },
    )
