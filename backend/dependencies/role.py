from fastapi import Depends, HTTPException, status
from ..routers.deps import get_current_user_id
from ..database import user_collection
from bson import ObjectId

ALLOWED_ROLES = {"guest", "host", "admin"}

async def get_current_user(user_id: str = Depends(get_current_user_id)):
    """Fetch the full user document from MongoDB.
    Guarantees a ``role`` key – defaults to ``guest`` for legacy documents.
    If role is missing or not in ALLOWED_ROLES, treat as ``guest``.
    """
    user = await user_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    role = user.get("role")
    if role not in ALLOWED_ROLES:
        role = "guest"
    user["role"] = role
    return user

def require_role(required_role: str):
    async def dependency(user: dict = Depends(get_current_user)):
        if user.get("role", "guest") != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{required_role.capitalize()} role required",
            )
        return user
    return dependency

# Convenience shortcuts
require_guest = require_role("guest")
require_host = require_role("host")
require_admin = require_role("admin")

def require_any_role(*allowed_roles: str):
    """Allow access if the user's role matches any of the provided roles.
    Useful for endpoints that both hosts and admins may use.
    """
    async def dependency(user: dict = Depends(get_current_user)):
        if user.get("role", "guest") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"One of the roles {allowed_roles} required",
            )
        return user
    return dependency

