from fastapi import APIRouter, HTTPException, Header, Depends
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from ..models import EnquiryModel, EnquiryResponse
from ..database import enquiry_collection, homestay_collection
from .deps import get_current_user_id

router = APIRouter()

@router.post("/", response_model=EnquiryResponse)
async def create_enquiry(enquiry: EnquiryModel):
    # Verify homestay exists
    try:
        homestay = await homestay_collection.find_one({"_id": ObjectId(enquiry.homestayId)})
        if not homestay:
            raise HTTPException(status_code=404, detail="Homestay not found")
    except:
        raise HTTPException(status_code=400, detail="Invalid homestay ID")

    enquiry_dict = enquiry.model_dump()
    new_enquiry = await enquiry_collection.insert_one(enquiry_dict)
    created_enquiry = await enquiry_collection.find_one({"_id": new_enquiry.inserted_id})
    created_enquiry["id"] = str(created_enquiry["_id"])
    return created_enquiry

@router.get("/owner")
async def get_owner_enquiries(user_id: str = Depends(get_current_user_id)):
    # Find all homestays owned by this user
    cursor = homestay_collection.find({"userId": user_id})
    owned_homestays = {}
    async for h in cursor:
        owned_homestays[str(h["_id"])] = h

    if not owned_homestays:
        return []

    # Find enquiries for these homestays
    enquiries_cursor = enquiry_collection.find({"homestayId": {"$in": list(owned_homestays.keys())}})
    enquiries = []
    async for e in enquiries_cursor:
        e["id"] = str(e["_id"])
        # Attach homestay info
        homestay = owned_homestays.get(e["homestayId"])
        if homestay:
            e["homestayTitle"] = homestay.get("title")
            e["homestayAddress"] = homestay.get("address")
        enquiries.append(e)
        
    enquiries.sort(key=lambda x: x.get("createdAt", datetime.min), reverse=True)
    return enquiries
