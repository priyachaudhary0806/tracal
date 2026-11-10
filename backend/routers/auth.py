from fastapi import APIRouter, HTTPException, status, Depends, Header
import bcrypt
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from typing import Optional, List
from bson import ObjectId
import os
import asyncio
import logging
import secrets
import hashlib

from ..models import (
    UserModel,
    UserResponse,
    UserLogin,
    Token,
    ForgotPassword,
    VerifyEmailRequest,
    ResendVerificationRequest,
)
from ..database import user_collection, homestay_collection
from ..email import (
    send_email,
    welcome_email,
    login_notification_email,
    verification_email,
)

router = APIRouter()

# Configuration loaded from settings module.
from ..settings import settings

SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_verification_token() -> tuple[str, str, datetime]:
    """Generates a cryptographically secure random token, its SHA-256 hash, and 15-minute expiry."""
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    return raw_token, token_hash, expires_at

@router.post("/signup", response_model=UserResponse)
async def signup(user: UserModel):
    email_clean = user.email.strip().lower()
    existing_user = await user_collection.find_one({"email": email_clean})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user.model_dump()
    user_dict["email"] = email_clean
    user_dict["password"] = get_password_hash(user_dict["password"])
    # Always force new registrations to guest role — never allow self-promotion to admin/host
    user_dict["role"] = "guest"
    user_dict["host_verified"] = False
    
    # Generate single-use verification token (store ONLY the hash in MongoDB)
    raw_token, token_hash, expires_at = generate_verification_token()
    user_dict["is_verified"] = False
    user_dict["verification_token_hash"] = token_hash
    user_dict["verification_token_expires_at"] = expires_at
    user_dict["verification_last_sent_at"] = datetime.now(timezone.utc)
    
    new_user = await user_collection.insert_one(user_dict)
    created_user = await user_collection.find_one({"_id": new_user.inserted_id})
    created_user["id"] = str(created_user["_id"])
    if not created_user.get("favoriteIds"):
        created_user["favoriteIds"] = []
    if "role" not in created_user or created_user["role"] not in ("guest", "host", "admin"):
        created_user["role"] = "guest"

    # Send verification email in background using SMTP
    verification_url = f"{FRONTEND_URL}/verify-email?token={raw_token}"
    async def _send_verification():
        try:
            await send_email(
                created_user["email"],
                *verification_email(created_user["name"], created_user["email"], verification_url)
            )
        except Exception as exc:
            logging.getLogger(__name__).warning(f"Verification email failed for {created_user['email']}: {exc}")

    asyncio.create_task(_send_verification())

    # Do not expose verification token hash or sensitive fields in response
    created_user.pop("verification_token_hash", None)
    created_user.pop("verification_token_expires_at", None)
    created_user.pop("verification_last_sent_at", None)

    return created_user

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    email_clean = user.email.strip().lower()
    db_user = await user_collection.find_one({"email": email_clean})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Email verification check:
    # Only newly registered unverified accounts have is_verified == False.
    # Existing legacy users without is_verified remain unlocked.
    if db_user.get("is_verified") is False:
        raise HTTPException(
            status_code=403,
            detail="Your email is not verified. Please verify your email before logging in or click 'Resend Verification Email'."
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user["email"], "userId": str(db_user["_id"])}, expires_delta=access_token_expires
    )

    # Send login notification email (non-blocking)
    async def _send_login():
        try:
            await send_email(db_user["email"], *login_notification_email(db_user["name"], db_user["email"]))
        except Exception as exc:
            logging.getLogger(__name__).warning(f"Login notification email failed for {db_user['email']}: {exc}")

    asyncio.create_task(_send_login())

    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/verify-email")
async def verify_email(payload: VerifyEmailRequest):
    raw_token = (payload.token or "").strip()
    if not raw_token:
        raise HTTPException(status_code=400, detail="Missing or invalid verification token.")

    # Hash the provided token to look up the user
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    user = await user_collection.find_one({"verification_token_hash": token_hash})

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or already used verification link. If you already verified, please log in."
        )

    # Check token expiration
    expires_at = user.get("verification_token_expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            # Clear the expired token so it cannot be reused
            await user_collection.update_one(
                {"_id": user["_id"]},
                {"$unset": {"verification_token_hash": "", "verification_token_expires_at": ""}}
            )
            raise HTTPException(
                status_code=400,
                detail="Verification link has expired (15-minute validity). Please request a new verification email."
            )

    # Mark user as verified and delete token (single-use)
    await user_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"is_verified": True},
            "$unset": {"verification_token_hash": "", "verification_token_expires_at": ""}
        }
    )

    # Send welcome email now that the user is verified
    async def _send_welcome():
        try:
            await send_email(user["email"], *welcome_email(user["name"], user["email"]))
        except Exception as exc:
            logging.getLogger(__name__).warning(f"Welcome email failed for {user['email']}: {exc}")

    asyncio.create_task(_send_welcome())

    return {
        "success": True,
        "message": "Email verified successfully! You can now log in.",
        "email": user["email"]
    }

@router.post("/resend-verification")
async def resend_verification(payload: ResendVerificationRequest):
    email_clean = (payload.email or "").strip().lower()
    if not email_clean:
        raise HTTPException(status_code=400, detail="Email is required.")

    user = await user_collection.find_one({"email": email_clean})

    # Do not leak user existence if not found
    if not user:
        return {
            "success": True,
            "message": "If an unverified account with this email exists, a new verification link has been sent."
        }

    # If already verified
    if user.get("is_verified") is True:
        return {
            "success": True,
            "message": "This account is already email-verified. You can log in directly."
        }

    # Rate limiting: 60-second cooldown between resend requests
    last_sent = user.get("verification_last_sent_at")
    if last_sent:
        if last_sent.tzinfo is None:
            last_sent = last_sent.replace(tzinfo=timezone.utc)
        elapsed = (datetime.now(timezone.utc) - last_sent).total_seconds()
        cooldown_seconds = 60
        if elapsed < cooldown_seconds:
            remaining = int(cooldown_seconds - elapsed)
            raise HTTPException(
                status_code=429,
                detail=f"Please wait {remaining} seconds before requesting another verification email."
            )

    # Generate new single-use token and update user
    raw_token, token_hash, expires_at = generate_verification_token()
    await user_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "verification_token_hash": token_hash,
                "verification_token_expires_at": expires_at,
                "verification_last_sent_at": datetime.now(timezone.utc)
            }
        }
    )

    # Dispatch email
    verification_url = f"{FRONTEND_URL}/verify-email?token={raw_token}"
    async def _send():
        try:
            await send_email(
                user["email"],
                *verification_email(user["name"], user["email"], verification_url)
            )
        except Exception as exc:
            logging.getLogger(__name__).warning(f"Resend verification email failed for {user['email']}: {exc}")

    asyncio.create_task(_send())

    return {
        "success": True,
        "message": "A new verification link has been sent to your email. Please check your inbox."
    }

@router.post("/forgot-password")
async def forgot_password(req: ForgotPassword):
    # Stub for sending real email
    return {"message": "If an account with that email exists, a password reset link has been sent."}

@router.get("/me", response_model=UserResponse)
async def get_me(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    user = await user_collection.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
        
    user["id"] = str(user["_id"])
    # Ensure favoriteIds is always a list — older documents may not have the field
    if "favoriteIds" not in user or user["favoriteIds"] is None:
        user["favoriteIds"] = []
    # Ensure role is always a valid value — older documents may not have the field
    if user.get("role") not in ("guest", "host", "admin"):
        user["role"] = "guest"
    # Ensure host_verified defaults to False for legacy docs
    if "host_verified" not in user:
        user["host_verified"] = False
    # Ensure is_verified defaults to True for legacy docs
    if "is_verified" not in user:
        user["is_verified"] = True
    return user


# ---------------------------------------------------------------------------
# Favorites endpoints
# ---------------------------------------------------------------------------

async def _get_user_id_from_header(authorization: Optional[str] = Header(None)) -> str:
    """Auth dependency reused locally — mirrors deps.py but lives here to avoid
    a circular import (deps imports from auth)."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization Header")
    try:
        token = authorization.split(" ")[1] if " " in authorization else authorization
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("userId")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return user_id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.patch("/favorites/{homestay_id}")
async def toggle_favorite(
    homestay_id: str,
    user_id: str = Depends(_get_user_id_from_header),
):
    """
    Toggle a homestay in the current user's favoriteIds list.
    - If the id is NOT in the list → add it ($addToSet).
    - If the id IS already in the list → remove it ($pull).
    Returns the updated favoriteIds list.
    """
    # Verify homestay exists
    try:
        homestay = await homestay_collection.find_one({"_id": ObjectId(homestay_id)})
        if not homestay:
            raise HTTPException(status_code=404, detail="Homestay not found")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid homestay ID")

    user = await user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    current_favorites: List[str] = user.get("favoriteIds", [])

    if homestay_id in current_favorites:
        # Remove
        await user_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$pull": {"favoriteIds": homestay_id}},
        )
        action = "removed"
    else:
        # Add
        await user_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$addToSet": {"favoriteIds": homestay_id}},
        )
        action = "added"

    updated_user = await user_collection.find_one({"_id": ObjectId(user_id)})
    return {
        "action": action,
        "favoriteIds": updated_user.get("favoriteIds", []),
    }


@router.get("/favorites")
async def get_favorites(user_id: str = Depends(_get_user_id_from_header)):
    """
    Returns the full homestay documents for all IDs in the user's favoriteIds.
    """
    user = await user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    favorite_ids: List[str] = user.get("favoriteIds", [])
    if not favorite_ids:
        return []

    # Fetch all favorited homestays in a single query
    cursor = homestay_collection.find(
        {"_id": {"$in": [ObjectId(fid) for fid in favorite_ids if ObjectId.is_valid(fid)]}}
    )
    results = []
    async for doc in cursor:
        doc["id"] = str(doc["_id"])
        results.append(doc)
    return results


# ---------------------------------------------------------------------------
# Role endpoint — lightweight check for client-side role-based rendering
# ---------------------------------------------------------------------------

@router.get("/role")
async def get_role(user_id: str = Depends(_get_user_id_from_header)):
    """Return the current user's role and host_verified flag.
    Useful for quick client-side checks without re-fetching the full profile.
    """
    user = await user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = user.get("role", "guest")
    if role not in ("guest", "host", "admin"):
        role = "guest"
    return {
        "role": role,
        "host_verified": user.get("host_verified", False),
    }


# ---------------------------------------------------------------------------
# Profile update
# ---------------------------------------------------------------------------

from pydantic import BaseModel as ProfileBase

class ProfileUpdateModel(ProfileBase):
    name: Optional[str] = None

@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    update: ProfileUpdateModel,
    user_id: str = Depends(_get_user_id_from_header),
):
    """Allow authenticated users to update their display name."""
    if not update.name or not update.name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    await user_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"name": update.name.strip()}},
    )
    updated = await user_collection.find_one({"_id": ObjectId(user_id)})
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    updated["id"] = str(updated["_id"])
    if not updated.get("favoriteIds"):
        updated["favoriteIds"] = []
    if updated.get("role") not in ("guest", "host", "admin"):
        updated["role"] = "guest"
    return updated
