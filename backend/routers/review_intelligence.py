from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import json
import httpx

from ..database import review_collection, homestay_collection, user_collection
from ..routers.deps import get_current_user_id, get_optional_user_id
from ..services.feature_access import check_feature_access, AI_FEATURE_REVIEW_INTELLIGENCE
from ..settings import settings

router = APIRouter()

async def run_gemini_review_analysis(reviews: List[Dict[str, Any]], homestay_title: str) -> Dict[str, Any]:
    """Runs Gemini analysis strictly on real reviews provided."""
    api_key = settings.GEMINI_API_KEY.strip() if settings.GEMINI_API_KEY else ""
    if not api_key:
        return {
            "status": "api_key_required",
            "configured": False,
            "message": "Google Gemini API key (GEMINI_API_KEY) is not configured in backend/.env. AI Review Intelligence is temporarily offline.",
        }

    reviews_text = "\n".join([
        f"- Rating: {r.get('rating')}/5 stars. Guest Review: \"{r.get('comment', '').strip()}\""
        for r in reviews if r.get("comment")
    ])

    if not reviews_text.strip():
        reviews_text = "\n".join([f"- Rating: {r.get('rating')}/5 stars (No text comment)." for r in reviews])

    prompt = f"""
You are TRACAL's AI Review Intelligence engine for authentic Indian homestays.
Analyze ONLY the genuine guest reviews provided below for the homestay "{homestay_title}".
Do NOT hallucinate or assume facts that are not present in these guest reviews.

Guest Reviews:
{reviews_text}

Provide an objective JSON output with:
1. "summary": A concise 2-3 sentence overview of genuine guest sentiments.
2. "sentiment": One of "Positive", "Mostly Positive", "Mixed", or "Needs Attention".
3. "positive_themes": Array of up to 4 specific positive aspects mentioned by guests.
4. "negative_themes": Array of specific concerns or drawbacks mentioned by guests (empty array if none mentioned).
5. "host_suggestions": Array of 2-3 actionable, polite recommendations for the host to improve guest satisfaction.

Output ONLY valid JSON without Markdown backticks.
"""

    primary_model = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash")
    fallback_model = getattr(settings, "GEMINI_FALLBACK_MODEL", "gemini-3.5-flash-lite")
    models_to_try = [primary_model, fallback_model]

    last_status_code = 500
    last_err_detail = "Review intelligence is temporarily unavailable."

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
                            "summary": parsed.get("summary", ""),
                            "sentiment": parsed.get("sentiment", "Mixed"),
                            "positive_themes": parsed.get("positive_themes", []),
                            "negative_themes": parsed.get("negative_themes", []),
                            "host_suggestions": parsed.get("host_suggestions", []),
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
async def get_homestay_review_intelligence(
    homestay_id: str,
    optional_user_id: Optional[str] = Depends(get_optional_user_id),
):
    """
    Public endpoint for travellers and visitors to see AI-generated intelligence
    distilled from genuine guest reviews.
    """
    user = (
        await user_collection.find_one({"_id": ObjectId(optional_user_id)})
        if optional_user_id and ObjectId.is_valid(optional_user_id)
        else None
    )
    if not check_feature_access(user, AI_FEATURE_REVIEW_INTELLIGENCE):
        raise HTTPException(status_code=403, detail="AI Review Intelligence access restricted")

    try:
        hs = await homestay_collection.find_one({"_id": ObjectId(homestay_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid homestay ID")

    if not hs:
        raise HTTPException(status_code=404, detail="Homestay not found")

    # Fetch genuine non-hidden reviews from MongoDB
    cursor = review_collection.find({"homestayId": homestay_id, "is_hidden": {"$ne": True}})
    reviews = []
    async for r in cursor:
        reviews.append(r)

    if len(reviews) < 2:
        return {
            "status": "insufficient_reviews",
            "homestay_id": homestay_id,
            "homestay_title": hs.get("title", "Homestay"),
            "review_count": len(reviews),
            "ai_generated": False,
            "message": (
                "Insufficient reviews to generate AI Review Intelligence. "
                f"This homestay currently has {len(reviews)} review{'s' if len(reviews) == 1 else ''}. "
                "At least 2 genuine guest reviews are required to generate trustworthy insights."
            ),
        }

    ai_res = await run_gemini_review_analysis(reviews, hs.get("title", "Homestay"))
    ai_res["homestay_id"] = homestay_id
    ai_res["homestay_title"] = hs.get("title", "Homestay")
    ai_res["review_count"] = len(reviews)
    return ai_res

@router.get("/host/{homestay_id}")
async def get_host_review_intelligence(
    homestay_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Host-specific endpoint providing actionable intelligence and suggestions.
    Strictly enforces that the requesting host owns the homestay.
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

    if len(reviews) < 2:
        return {
            "status": "insufficient_reviews",
            "homestay_id": homestay_id,
            "homestay_title": hs.get("title", "Homestay"),
            "review_count": len(reviews),
            "ai_generated": False,
            "message": f"You currently have {len(reviews)} review{'s' if len(reviews) == 1 else ''}. At least 2 reviews are required to generate host sentiment insights.",
        }

    ai_res = await run_gemini_review_analysis(reviews, hs.get("title", "Homestay"))
    ai_res["homestay_id"] = homestay_id
    ai_res["homestay_title"] = hs.get("title", "Homestay")
    ai_res["review_count"] = len(reviews)
    return ai_res

