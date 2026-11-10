from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import json
import httpx

from ..database import review_collection, homestay_collection, user_collection
from ..routers.deps import get_current_user_id, get_optional_user_id
from ..services.feature_access import check_feature_access, AI_FEATURE_REALITY_CHECK
from ..settings import settings

router = APIRouter()

async def run_gemini_reality_check(homestay: Dict[str, Any], reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
    api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
    if not api_key:
        return {
            "status": "api_key_required",
            "configured": False,
            "message": "Google Gemini API key (GEMINI_API_KEY) is not configured in backend/.env. Reality Check is temporarily offline.",
        }

    reviews_text = "\n".join([
        f"- Guest Review (Rating {r.get('rating')}/5): \"{r.get('comment', '').strip()}\""
        for r in reviews if r.get("comment")
    ])

    if not reviews_text.strip():
        reviews_text = f"Total {len(reviews)} reviews with average rating, but no written commentary."

    listing_summary = f"""
Title: {homestay.get('title')}
Description: {homestay.get('description')}
Location/Address: {homestay.get('address')}
Price: ₹{homestay.get('price')} / night
Amenities listed: {', '.join(homestay.get('amenities', []))}
Category: {homestay.get('category')}
"""

    prompt = f"""
You are TRACAL's AI Reality Check engine for Indian homestays.
Compare the Host's Advertised Listing Details against Actual Guest Feedback.
Do NOT present unverified allegations as confirmed facts. Clearly distinguish listing claims from review observations.

--- ADVERTISED LISTING DETAILS ---
{listing_summary}

--- ACTUAL GUEST FEEDBACK ---
{reviews_text}

Provide an objective JSON output with:
1. "accuracy_rating": One of "High Match", "Good Match", "Partial Discrepancies", or "Needs Verification".
2. "verified_highlights": Array of up to 4 features advertised by host that guests explicitly confirmed in reviews.
3. "observations_and_caveats": Array of objects, each with:
   - "topic": Short title (e.g., "Noise Level", "Road Access", "WiFi Speed").
   - "advertised_claim": What the host description says or implies.
   - "guest_reality": What guest reviews noted.
   - "type": "observation" or "discrepancy".
4. "advice_for_guests": 2 practical tips for prospective guests booking this homestay.
5. "advice_for_host": 2 constructive suggestions for the host to update the description to align expectations.

Output ONLY valid JSON without Markdown backticks.
"""

    primary_model = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash")
    fallback_model = getattr(settings, "GEMINI_FALLBACK_MODEL", "gemini-3.5-flash-lite")
    models_to_try = [primary_model, fallback_model]

    last_status_code = 500
    last_err_detail = "Reality Check is temporarily offline."

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            for model_name in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                res = await client.post(
                    url,
                    json={"contents": [{"parts": [{"text": prompt}]}]},
                    headers={"Content-Type": "application/json"}
                )
                if res.status_code == 200:
                    resp_json = res.json()
                    candidates = resp_json.get("candidates", [])
                    if candidates:
                        text_val = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        cleaned_text = text_val.strip()
                        if cleaned_text.startswith("```json"):
                            cleaned_text = cleaned_text[7:]
                        if cleaned_text.startswith("```"):
                            cleaned_text = cleaned_text[3:]
                        if cleaned_text.endswith("```"):
                            cleaned_text = cleaned_text[:-3]
                        parsed = json.loads(cleaned_text.strip())
                        return {
                            "status": "success",
                            "configured": True,
                            "ai_generated": True,
                            "model_used": model_name,
                            "generated_at": datetime.now(timezone.utc).isoformat(),
                            "accuracy_rating": parsed.get("accuracy_rating", "Good Match"),
                            "verified_highlights": parsed.get("verified_highlights", []),
                            "observations_and_caveats": parsed.get("observations_and_caveats", []),
                            "advice_for_guests": parsed.get("advice_for_guests", []),
                            "advice_for_host": parsed.get("advice_for_host", []),
                        }
                last_status_code = res.status_code
                try:
                    err_json = res.json()
                    err_msg = err_json.get("error", {}).get("message", "")
                    if err_msg:
                        last_err_detail = err_msg
                except Exception:
                    pass

            return {
                "status": "service_unavailable",
                "configured": True,
                "message": f"Gemini API returned status {last_status_code}: {last_err_detail}",
            }
    except Exception as e:
        return {
            "status": "error",
            "configured": True,
            "message": f"Failed to contact Gemini API: {str(e)}",
        }

@router.get("/{homestay_id}")
async def get_homestay_reality_check(
    homestay_id: str,
    optional_user_id: Optional[str] = Depends(get_optional_user_id),
):
    """
    Public endpoint for travellers and visitors to see Reality Check comparison
    between advertised description and real guest feedback.
    """
    user = (
        await user_collection.find_one({"_id": ObjectId(optional_user_id)})
        if optional_user_id and ObjectId.is_valid(optional_user_id)
        else None
    )
    if not check_feature_access(user, AI_FEATURE_REALITY_CHECK):
        raise HTTPException(status_code=403, detail="Reality Check access restricted")

    try:
        hs = await homestay_collection.find_one({"_id": ObjectId(homestay_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid homestay ID")

    if not hs:
        raise HTTPException(status_code=404, detail="Homestay not found")

    cursor = review_collection.find({"homestayId": homestay_id, "is_hidden": {"$ne": True}})
    reviews = []
    async for r in cursor:
        reviews.append(r)

    if not reviews:
        return {
            "status": "insufficient_reviews",
            "homestay_id": homestay_id,
            "homestay_title": hs.get("title", "Homestay"),
            "review_count": 0,
            "ai_generated": False,
            "message": (
                "No guest reviews available yet. Reality Check compares advertised descriptions "
                "against real guest experiences and requires at least one guest review."
            ),
        }

    ai_res = await run_gemini_reality_check(hs, reviews)
    ai_res["homestay_id"] = homestay_id
    ai_res["homestay_title"] = hs.get("title", "Homestay")
    ai_res["review_count"] = len(reviews)
    return ai_res

@router.get("/host/{homestay_id}")
async def get_host_reality_check(
    homestay_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Host-specific endpoint to audit listing accuracy.
    Strictly forbids accessing another host's property.
    """
    try:
        hs = await homestay_collection.find_one({"_id": ObjectId(homestay_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid homestay ID")

    if not hs:
        raise HTTPException(status_code=404, detail="Homestay not found")

    # Strict IDOR protection
    if str(hs.get("userId")) != str(current_user_id):
        raise HTTPException(status_code=403, detail="Access denied. You can only view insights for your own properties.")

    cursor = review_collection.find({"homestayId": homestay_id, "is_hidden": {"$ne": True}})
    reviews = []
    async for r in cursor:
        reviews.append(r)

    if not reviews:
        return {
            "status": "insufficient_reviews",
            "homestay_id": homestay_id,
            "homestay_title": hs.get("title", "Homestay"),
            "review_count": 0,
            "ai_generated": False,
            "message": "No reviews have been submitted for this listing yet. Once guests stay and review, Reality Check will help you align your description with actual experiences.",
        }

    ai_res = await run_gemini_reality_check(hs, reviews)
    ai_res["homestay_id"] = homestay_id
    ai_res["homestay_title"] = hs.get("title", "Homestay")
    ai_res["review_count"] = len(reviews)
    return ai_res

