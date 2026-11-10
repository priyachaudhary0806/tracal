from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import List, Optional
from bson import ObjectId
import os
import uuid
from datetime import datetime

from pydantic import BaseModel
from ..models import HostVerificationModel, HostVerificationResponse
from ..database import (
    host_verification_collection,
    user_collection,
    notification_collection,
    admin_log_collection,
)
from ..email import send_email, _base_template
from .deps import get_current_user_id
import asyncio

router = APIRouter()

# Ensure directory for verification uploads exists (outside public static folder)
VERIF_UPLOAD_DIR = os.path.join("uploads", "verification")
os.makedirs(VERIF_UPLOAD_DIR, exist_ok=True)

def _save_upload(file: UploadFile) -> str:
    """Save uploaded file to the verification directory and return relative path."""
    ext = os.path.splitext(file.filename)[1].lower()
    safe_name = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(VERIF_UPLOAD_DIR, safe_name)
    with open(file_path, "wb") as buffer:
        # Read in chunks to avoid large memory usage
        for chunk in iter(lambda: file.file.read(1024 * 1024), b""):
            buffer.write(chunk)
    # Return path relative to the project root (used for later retrieval by admin only)
    return file_path

@router.post("/", response_model=HostVerificationResponse, status_code=status.HTTP_201_CREATED)
async def submit_verification(
    full_name: str = Form(...),
    phone: str = Form(...),
    id_type: str = Form(...),
    address: str = Form(...),
    id_document: UploadFile = File(...),
    ownership_proof: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """Host submits verification request. Files are stored securely (not served publicly)."""
    # Save files
    id_doc_path = _save_upload(id_document)
    ownership_path = _save_upload(ownership_proof)

    verification = HostVerificationModel(
        userId=user_id,
        full_name=full_name,
        phone=phone,
        id_type=id_type,
        address=address,
        id_document_path=id_doc_path,
        ownership_proof_path=ownership_path,
        status="pending",
        submittedAt=datetime.utcnow(),
    )
    verification_dict = verification.model_dump()
    result = await host_verification_collection.insert_one(verification_dict)
    created = await host_verification_collection.find_one({"_id": result.inserted_id})
    created["id"] = str(created["_id"])
    return created

@router.get("/status", response_model=Optional[HostVerificationResponse])
async def get_my_verification_status(user_id: str = Depends(get_current_user_id)):
    """Return the current user's latest verification request (or None)."""
    doc = await host_verification_collection.find_one({"userId": user_id}, sort=[("_id", -1)])
    if doc:
        doc["id"] = str(doc["_id"])
    return doc

async def _require_admin(user_id: str):
    """Async helper — confirm the requesting user has admin role."""
    user = await user_collection.find_one({"_id": ObjectId(user_id)})
    if not user or user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user

@router.get("/admin", response_model=List[HostVerificationResponse])
async def list_verifications(
    status: Optional[str] = None,
    admin_user_id: str = Depends(get_current_user_id),
):
    """Admin endpoint – list all host verification requests, optional status filter."""
    await _require_admin(admin_user_id)
    query: dict = {}
    if status:
        query["status"] = status
    cursor = host_verification_collection.find(query).sort("submittedAt", -1)
    result = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        result.append(doc)
    return result

class AdminUpdateModel(BaseModel):
    status: str  # "approved" or "rejected"
    rejectionReason: Optional[str] = None

@router.patch("/admin/{verification_id}", response_model=HostVerificationResponse)
async def admin_update_verification(
    verification_id: str,
    update: AdminUpdateModel,
    admin_user_id: str = Depends(get_current_user_id),
):
    """Admin approves or rejects a verification request. On approval the host user is marked verified."""
    admin_user = await _require_admin(admin_user_id)
    verification = await host_verification_collection.find_one({"_id": ObjectId(verification_id)})
    if not verification:
        raise HTTPException(status_code=404, detail="Verification request not found")
    if update.status not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid status value")

    if update.status == "rejected" and not (update.rejectionReason and update.rejectionReason.strip()):
        raise HTTPException(status_code=400, detail="Rejection reason is required when rejecting a verification request")

    clean_reason = update.rejectionReason.strip() if (update.status == "rejected" and update.rejectionReason) else None

    update_fields: dict = {
        "status": update.status,
        "reviewedAt": datetime.utcnow(),
        "rejectionReason": clean_reason,
    }

    await host_verification_collection.update_one({"_id": ObjectId(verification_id)}, {"$set": update_fields})

    # Sync host user flag when approved
    if update.status == "approved":
        await user_collection.update_one(
            {"_id": ObjectId(verification["userId"])},
            {"$set": {"host_verified": True, "role": "host"}},
        )
    else:
        await user_collection.update_one(
            {"_id": ObjectId(verification["userId"])},
            {"$set": {"host_verified": False}},
        )

    # In-app notification to host
    msg = f"Your host verification has been {update.status}."
    if update.status == "rejected":
        msg += f" Reason: {clean_reason}"
    else:
        msg += " You are now recognized as a verified host on Tracal."

    await notification_collection.insert_one({
        "userId": str(verification["userId"]),
        "type": "host_verification",
        "message": msg,
        "read": False,
        "createdAt": datetime.utcnow(),
    })

    # Email notification to host
    host_user = await user_collection.find_one({"_id": ObjectId(verification["userId"])})
    if host_user and host_user.get("email"):
        subject = f"Host Verification Update: {update.status.capitalize()}"
        body_html = f"""
          <h2 style="margin:0 0 8px;color:#1e293b;font-size:20px;font-weight:700;">Host Verification {update.status.capitalize()}</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;">{msg}</p>
        """
        asyncio.create_task(send_email(host_user["email"], subject, _base_template(subject, body_html)))

    # Admin audit log
    await admin_log_collection.insert_one({
        "adminId": str(admin_user_id),
        "adminEmail": admin_user.get("email", ""),
        "action": f"verification_{update.status}",
        "targetType": "host_verification",
        "targetId": str(verification["_id"]),
        "details": {
            "host_id": str(verification["userId"]),
            "host_name": verification.get("full_name"),
            "rejection_reason": clean_reason,
        },
        "createdAt": datetime.utcnow(),
    })

    updated = await host_verification_collection.find_one({"_id": ObjectId(verification_id)})
    updated["id"] = str(updated["_id"])
    return updated
