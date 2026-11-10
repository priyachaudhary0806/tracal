"""
Shared FastAPI dependency utilities.
Import `get_current_user_id` and `get_optional_user_id` from here.
"""
from fastapi import HTTPException, Header, Request, status
from typing import Optional
from jose import jwt, JWTError

from .auth import SECRET_KEY, ALGORITHM


def _extract_token_from_header_or_cookie(
    authorization: Optional[str],
    request: Optional[Request],
) -> Optional[str]:
    """Extract raw JWT token string from Authorization header or cookie fallback."""
    if authorization:
        token = authorization.split(" ")[1] if " " in authorization else authorization
        if token.strip():
            return token.strip()
    if request and hasattr(request, "cookies"):
        token = request.cookies.get("token")
        if token and token.strip():
            return token.strip()
    return None


async def get_current_user_id(
    request: Request,
    authorization: Optional[str] = Header(None),
) -> str:
    """
    Extracts and validates the JWT from Authorization: Bearer <token> header
    or the 'token' cookie fallback.
    Returns the userId string embedded in the token payload.
    Raises HTTP 401 on missing or invalid token.
    """
    token = _extract_token_from_header_or_cookie(authorization, request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header",
        )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("userId")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        return str(user_id)
    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


async def get_optional_user_id(
    request: Request,
    authorization: Optional[str] = Header(None),
) -> Optional[str]:
    """
    Extracts and validates JWT if present, returning the userId.
    If no authorization header or cookie is supplied, returns None without raising 401.
    Allows unauthenticated visitors to view public endpoints.
    """
    token = _extract_token_from_header_or_cookie(authorization, request)
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("userId")
        return str(user_id) if user_id else None
    except Exception:
        # If an invalid or expired token was sent, treat as unauthenticated for public endpoints
        return None
