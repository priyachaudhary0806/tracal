from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from bson import ObjectId
from datetime import datetime

from ..models import NotificationModel, NotificationResponse
from ..database import notification_collection
from .deps import get_current_user_id

router = APIRouter()

@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(user_id: str = Depends(get_current_user_id), unread: bool = False):
    query = {"userId": user_id}
    if unread:
        query["read"] = False
    cursor = notification_collection.find(query).sort("createdAt", -1)
    notifications = []
    async for n in cursor:
        n["id"] = str(n["_id"])
        notifications.append(n)
    return notifications

@router.patch("/{notif_id}/read", response_model=NotificationResponse)
async def mark_as_read(notif_id: str, user_id: str = Depends(get_current_user_id)):
    notif = await notification_collection.find_one({"_id": ObjectId(notif_id)})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notif.get("userId") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this notification")
    await notification_collection.update_one({"_id": ObjectId(notif_id)}, {"$set": {"read": True}})
    updated = await notification_collection.find_one({"_id": ObjectId(notif_id)})
    updated["id"] = str(updated["_id"])
    return updated

