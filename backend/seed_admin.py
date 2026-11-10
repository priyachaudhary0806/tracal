"""
Idempotent admin seed script for TRACAL.
Creates the administrator account using ADMIN_EMAIL and ADMIN_PASSWORD
configured in backend/.env if it does not already exist.

Usage:
    python -m backend.seed_admin
"""

import sys
import asyncio
import logging
from datetime import datetime, timezone
import bcrypt

from .settings import settings
from .database import user_collection

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_admin")

def hash_password(password: str) -> str:
    """Hashes password using bcrypt (same as auth.py)."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

async def seed_admin():
    admin_email = (settings.ADMIN_EMAIL or "").strip().lower()
    admin_password = settings.ADMIN_PASSWORD or ""

    if not admin_email or not admin_password:
        logger.error("ADMIN_EMAIL or ADMIN_PASSWORD is empty in settings. Please configure them in backend/.env.")
        sys.exit(1)

    logger.info(f"Checking if admin account exists for: {admin_email}")
    existing_user = await user_collection.find_one({"email": admin_email})

    if existing_user:
        current_role = existing_user.get("role")
        if current_role == "admin":
            logger.info(f"Admin account already exists for {admin_email} with role 'admin'. Credentials and roles preserved.")
            # Ensure email is verified and host_verified is explicitly False (admin does not automatically get host verification)
            updates = {}
            if existing_user.get("is_verified") is not True:
                updates["is_verified"] = True
            if existing_user.get("host_verified") is not False:
                updates["host_verified"] = False
            if updates:
                await user_collection.update_one({"_id": existing_user["_id"]}, {"$set": updates})
                logger.info(f"Updated existing admin account with: {updates}")
            return
        else:
            logger.warning(
                f"A user with email {admin_email} already exists but has role '{current_role}'. "
                "Preserving existing user credentials as required; promoting to role 'admin'."
            )
            await user_collection.update_one(
                {"_id": existing_user["_id"]},
                {"$set": {"role": "admin", "is_verified": True, "host_verified": False}}
            )
            logger.info("Existing user role updated to 'admin', email verified, host_verified set to False.")
            return

    # User does not exist, create new admin
    hashed = hash_password(admin_password)
    admin_doc = {
        "name": "System Administrator",
        "email": admin_email,
        "password": hashed,
        "role": "admin",
        "host_verified": False,  # Administrator does NOT automatically receive host verification
        "is_verified": True,     # Seeded admin is email-verified
        "favoriteIds": [],
        "createdAt": datetime.now(timezone.utc),
    }

    result = await user_collection.insert_one(admin_doc)
    logger.info(f"Admin account successfully created with ID: {result.inserted_id} (email: {admin_email}, role: admin, is_verified: True)")

def main():
    asyncio.run(seed_admin())

if __name__ == "__main__":
    main()

