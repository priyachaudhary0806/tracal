from fastapi import APIRouter, Depends, HTTPException
from ..models import TrustScoreResponse, TrustScoreComponent
from ..database import homestay_collection, review_collection, user_collection
from ..routers.deps import get_current_user_id, get_optional_user_id
from ..services.feature_access import check_feature_access, AI_FEATURE_TRUSTSCORE
from bson import ObjectId
from typing import List, Dict, Any, Optional

router = APIRouter()

# Scoring scheme constants totaling exactly 100
HOST_VERIFICATION_MAX = 30
AVERAGE_RATING_MAX = 40  # based on 0-5 rating * 8
LISTING_COMPLETENESS_MAX = 10
LISTING_RATING_MAX = 20  # rating field * 4

def calculate_completeness(homestay: dict) -> int:
    required_fields = ["title", "description", "price", "address", "images", "amenities"]
    present = sum(1 for f in required_fields if homestay.get(f))
    return int((present / len(required_fields)) * LISTING_COMPLETENESS_MAX)

async def compute_homestay_trust_score(homestay: dict) -> Dict[str, Any]:
    homestay_id = str(homestay["_id"]) if "_id" in homestay else homestay.get("id")

    # Host verification component
    # Must explicitly check host_verified == True. Role 'admin' does NOT confer host verification.
    user_id_raw = homestay.get("userId")
    host_query = {"_id": ObjectId(user_id_raw)} if ObjectId.is_valid(user_id_raw) else {"_id": user_id_raw}
    host_user = await user_collection.find_one(host_query)
    host_verified = bool(host_user and host_user.get("host_verified") is True)
    verification_score = HOST_VERIFICATION_MAX if host_verified else 0
    verification_note = "Host identity and ownership verified" if host_verified else "Host identity not yet verified"

    # Average review rating component
    pipeline = [
        {"$match": {"homestayId": homestay_id, "is_hidden": {"$ne": True}}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    agg = await review_collection.aggregate(pipeline).to_list(length=1)
    if agg and agg[0].get("count", 0) > 0:
        avg_rating = agg[0]["avg"]
        review_count = agg[0]["count"]
        rating_score = int(avg_rating * 8)  # max 40
        rating_note = f"Average guest rating {avg_rating:.1f}/5 across {review_count} review{'s' if review_count > 1 else ''}"
    else:
        avg_rating = None
        review_count = 0
        rating_score = 0
        rating_note = "No guest reviews submitted yet"

    # Listing completeness component
    completeness_score = calculate_completeness(homestay)
    missing_fields = [f for f in ["title", "description", "price", "address", "images", "amenities"] if not homestay.get(f)]
    if completeness_score == LISTING_COMPLETENESS_MAX:
        completeness_note = "All required listing fields and photos present"
    else:
        completeness_note = f"Missing {', '.join(missing_fields)}"

    # Listing rating field component
    listing_rating = homestay.get("ratings", 0)
    listing_rating_score = int(listing_rating * 4)  # max 20
    listing_rating_note = f"Host base rating index: {listing_rating:.1f}/5" if listing_rating else "Standard initial rating tier"

    total = verification_score + rating_score + completeness_score + listing_rating_score

    # Suggestions for host improvement
    improvement_tips = []
    if not host_verified:
        improvement_tips.append("Submit your ID & property ownership documents for admin verification to gain +30 TrustScore points.")
    if completeness_score < LISTING_COMPLETENESS_MAX:
        improvement_tips.append(f"Add missing details ({', '.join(missing_fields)}) to earn +{LISTING_COMPLETENESS_MAX - completeness_score} completeness points.")
    if review_count == 0:
        improvement_tips.append("Encourage completed guests to leave genuine reviews to unlock up to +40 review rating points.")
    elif avg_rating and avg_rating < 4.5:
        improvement_tips.append("Deliver exceptional guest experiences to boost average ratings closer to 5.0 and maximize TrustScore.")

    breakdown = [
        TrustScoreComponent(name="Host Verification", score=verification_score, max_score=HOST_VERIFICATION_MAX, note=verification_note),
        TrustScoreComponent(name="Average Guest Review Rating", score=rating_score, max_score=AVERAGE_RATING_MAX, note=rating_note),
        TrustScoreComponent(name="Listing Completeness", score=completeness_score, max_score=LISTING_COMPLETENESS_MAX, note=completeness_note),
        TrustScoreComponent(name="Listing Rating Index", score=listing_rating_score, max_score=LISTING_RATING_MAX, note=listing_rating_note),
    ]

    return {
        "homestay_id": homestay_id,
        "title": homestay.get("title", "Homestay"),
        "total_score": total,
        "breakdown": breakdown,
        "explanation": (
            "TrustScore combines host verification (30%), guest review rating (40%), listing completeness (10%), and rating index (20%). "
            "Missing components result in 0 points for that section."
        ),
        "host_verified": host_verified,
        "review_count": review_count,
        "improvement_tips": improvement_tips,
    }

@router.get("/host/my-scores")
async def get_host_properties_trustscores(current_user_id: str = Depends(get_current_user_id)):
    """
    Returns TrustScore and improvement tips for all properties owned by the current host.
    Strictly forbids accessing another host's properties.
    """
    user = await user_collection.find_one({"_id": ObjectId(current_user_id)}) if ObjectId.is_valid(current_user_id) else None
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") not in ("host", "admin"):
        raise HTTPException(status_code=403, detail="Host role required to access Host TrustScores")

    # Find all homestays owned by this user
    cursor = homestay_collection.find({"userId": current_user_id})
    scores = []
    async for hs in cursor:
        score_data = await compute_homestay_trust_score(hs)
        scores.append(score_data)

    return {
        "count": len(scores),
        "scores": scores,
    }

@router.get("/{homestay_id}", response_model=TrustScoreResponse)
async def get_trust_score(homestay_id: str, optional_user_id: Optional[str] = Depends(get_optional_user_id)):
    """Public endpoint for travellers, visitors, and hosts to view a property's TrustScore."""
    user = (
        await user_collection.find_one({"_id": ObjectId(optional_user_id)})
        if optional_user_id and ObjectId.is_valid(optional_user_id)
        else None
    )
    if not check_feature_access(user, AI_FEATURE_TRUSTSCORE):
        raise HTTPException(status_code=403, detail="TrustScore access restricted")

    try:
        homestay = await homestay_collection.find_one({"_id": ObjectId(homestay_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid homestay ID")

    if not homestay:
        raise HTTPException(status_code=404, detail="Homestay not found")

    res = await compute_homestay_trust_score(homestay)
    return TrustScoreResponse(
        homestay_id=res["homestay_id"],
        total_score=res["total_score"],
        breakdown=res["breakdown"],
        explanation=res["explanation"],
    )
