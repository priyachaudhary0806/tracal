from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends

from typing import List, Optional
from bson import ObjectId

from ..models import HomestayModel, HomestayResponse
from ..database import homestay_collection, availability_collection, booking_collection, user_collection
from ..categories import CATEGORIES, Category
from .deps import get_current_user_id

router = APIRouter()

# Helper: map stored value to canonical label (or keep legacy)
def _canonical_label(value: str) -> str:
    for c in CATEGORIES:
        if value.lower() == c.slug.lower() or value.lower() == c.label.lower():
            return c.label
    return value

# Helper: resolve incoming value (slug or label, any case) to canonical slug
def _resolve_slug(value: str) -> str:
    for c in CATEGORIES:
        if value.lower() == c.slug.lower() or value.lower() == c.label.lower():
            return c.slug
    raise ValueError("Invalid category")

# ---------------------------------------------------------------------------
# Read endpoints (public — no auth required)
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[HomestayResponse])
async def get_homestays(
    category: Optional[str] = None,
    userId: Optional[str] = None,
    location: Optional[str] = None,
    maxPrice: Optional[int] = None,
    minPrice: Optional[int] = None,
    guestCount: Optional[int] = None,
    roomCount: Optional[int] = None,
    bathroomCount: Optional[int] = None,
    minRating: Optional[float] = None,
    amenities: Optional[str] = None,  # comma‑separated list
    check_in: Optional[datetime] = None,
    check_out: Optional[datetime] = None,
    sort_by: Optional[str] = None,
    ids: Optional[str] = None,
):
    """Extended homestay search supporting multiple filters.
    * `amenities` – comma‑separated list of required amenity strings.
    * `check_in` / `check_out` – ISO date strings; filters out homestays with blocked dates or approved bookings overlapping the range.
    * `sort_by` – one of "price_asc", "price_desc", "rating_desc", "reviews_desc".
    * `ids` – comma‑separated homestay IDs.
    """
    query: dict = {}
    if ids:
        # Accept a comma‑separated list of IDs
        id_list = [ObjectId(i) for i in ids.split(",") if i]
        query["_id"] = {"$in": id_list}
    if category:
        query["category"] = {"$regex": f"^{category}$", "$options": "i"}
    if userId:
        query["userId"] = userId
    if location:
        query["address"] = {"$regex": location, "$options": "i"}
    if maxPrice is not None:
        query.setdefault("price", {})["$lte"] = maxPrice
    if minPrice is not None:
        query.setdefault("price", {})["$gte"] = minPrice
    if minRating is not None:
        query["ratings"] = {"$gte": minRating}
    if guestCount is not None:
        query["guestCount"] = {"$gte": guestCount}
    if roomCount is not None:
        query["roomCount"] = {"$gte": roomCount}
    if bathroomCount is not None:
        query["bathroomCount"] = {"$gte": bathroomCount}
    if amenities:
        # Expecting comma separated strings
        am_list = [a.strip() for a in amenities.split(",") if a.strip()]
        query["amenities"] = {"$all": am_list}
    # Initial fetch – we'll apply date availability filtering in Python to reuse existing logic
    cursor = homestay_collection.find(query)
    homestays = []
    async for document in cursor:
        # Date availability filter
        if check_in and check_out:
            # Ensure check_out is after check_in (client should already enforce)
            # Check blocked dates
            blocked = await availability_collection.find_one({
                "homestayId": str(document["_id"]),
                "blockedDates": {
                    "$elemMatch": {
                        "start": {"$lt": check_out},
                        "end": {"$gt": check_in},
                    }
                },
            })
            conflict = await booking_collection.find_one({
                "homestayId": str(document["_id"]),
                "status": "approved",
                "startDate": {"$lt": check_out},
                "endDate": {"$gt": check_in},
            })
            if blocked or conflict:
                continue  # skip unavailable homestay
        document["id"] = str(document["_id"])
        if "category" in document:
            document["category"] = _canonical_label(document["category"])
        homestays.append(document)
    # Sorting
    if sort_by:
        reverse = False
        key_func = None
        if sort_by == "price_asc":
            key_func = lambda x: x.get("price", 0)
        elif sort_by == "price_desc":
            key_func = lambda x: x.get("price", 0)
            reverse = True
        elif sort_by == "rating_desc":
            key_func = lambda x: x.get("ratings", 0)
            reverse = True
        elif sort_by == "reviews_desc":
            key_func = lambda x: x.get("reviewCount", 0)
            reverse = True
        if key_func:
            homestays.sort(key=key_func, reverse=reverse)
    return homestays

async def get_homestays(
    category: Optional[str] = None,
    userId: Optional[str] = None,
    location: Optional[str] = None,
    maxPrice: Optional[int] = None,
    guestCount: Optional[int] = None,
    roomCount: Optional[int] = None,
    bathroomCount: Optional[int] = None,
):
    query = {}
    if category:
        # case‑insensitive exact match against stored value (slug or legacy title case)
        query["category"] = {"$regex": f"^{category}$", "$options": "i"}
    if userId:
        query["userId"] = userId
    if location:
        query["address"] = {"$regex": location, "$options": "i"}
    if maxPrice is not None:
        query["price"] = {"$lte": maxPrice}
    if guestCount is not None:
        query["guestCount"] = {"$gte": guestCount}
    if roomCount is not None:
        query["roomCount"] = {"$gte": roomCount}
    if bathroomCount is not None:
        query["bathroomCount"] = {"$gte": bathroomCount}

    cursor = homestay_collection.find(query)
    homestays = []
    async for document in cursor:
        document["id"] = str(document["_id"])
        if "category" in document:
            document["category"] = _canonical_label(document["category"])
        homestays.append(document)
    return homestays

@router.get("/{id}", response_model=HomestayResponse)
async def get_homestay(id: str):
    try:
        homestay = await homestay_collection.find_one({"_id": ObjectId(id)})
        if homestay:
            homestay["id"] = str(homestay["_id"])
            if "category" in homestay:
                homestay["category"] = _canonical_label(homestay["category"])
            return homestay
    except Exception:
        pass
    raise HTTPException(status_code=404, detail="Homestay not found")

# ---------------------------------------------------------------------------
# Write endpoints (auth required)
# ---------------------------------------------------------------------------

@router.post("/", response_model=HomestayResponse)
async def create_homestay(
    homestay: HomestayModel,
    current_user_id: str = Depends(get_current_user_id),
):
    """Create a new homestay with validated category."""
    homestay_dict = homestay.model_dump()
    # Validate and normalise category (accept slug or label, any case)
    try:
        homestay_dict["category"] = _resolve_slug(homestay_dict["category"])
    except Exception:
        raise HTTPException(status_code=400, detail="Unsupported category")
    # Ensure host is verified before creating a homestay
    user = await user_collection.find_one({"_id": ObjectId(current_user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.get("host_verified", False):
        raise HTTPException(status_code=403, detail="Host verification required to publish homestay")
    homestay_dict["userId"] = current_user_id

    new_homestay = await homestay_collection.insert_one(homestay_dict)
    created = await homestay_collection.find_one({"_id": new_homestay.inserted_id})
    created["id"] = str(created["_id"])
    if "category" in created:
        created["category"] = _canonical_label(created["category"])
    return created

@router.put("/{id}", response_model=HomestayResponse)
async def update_homestay(
    id: str,
    homestay: HomestayModel,
    current_user_id: str = Depends(get_current_user_id),
):
    """Update an existing homestay with validated category."""
    try:
        existing = await homestay_collection.find_one({"_id": ObjectId(id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid homestay ID")
    if not existing:
        raise HTTPException(status_code=404, detail="Homestay not found")
    if existing.get("userId") != current_user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this listing")

    homestay_dict = homestay.model_dump()
    try:
        homestay_dict["category"] = _resolve_slug(homestay_dict["category"])
    except Exception:
        raise HTTPException(status_code=400, detail="Unsupported category")
    homestay_dict["userId"] = existing["userId"]

    updated = await homestay_collection.find_one_and_update(
        {"_id": ObjectId(id)}, {"$set": homestay_dict}, return_document=True
    )
    if updated:
        updated["id"] = str(updated["_id"])
        if "category" in updated:
            updated["category"] = _canonical_label(updated["category"])
        return updated
    raise HTTPException(status_code=404, detail="Homestay not found")

@router.delete("/{id}")
async def delete_homestay(
    id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    try:
        existing = await homestay_collection.find_one({"_id": ObjectId(id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid homestay ID")
    if not existing:
        raise HTTPException(status_code=404, detail="Homestay not found")
    if existing.get("userId") != current_user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this listing")
    result = await homestay_collection.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 1:
        return {"message": "Homestay deleted successfully"}
    raise HTTPException(status_code=404, detail="Homestay not found")
