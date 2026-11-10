from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import json
import httpx
from bson import ObjectId

from ..database import personality_assessments_collection, user_collection
from ..routers.deps import get_current_user_id
from ..services.feature_access import check_feature_access, AI_FEATURE_PERSONALITY
from ..settings import settings

router = APIRouter()

QUESTIONS = [
    {
        "id": "q1",
        "question": "When you arrive at a new destination, what is your first instinct?",
        "options": [
            {"key": "A", "label": "Drop bags and explore bustling local streets and markets", "category": "culture"},
            {"key": "B", "label": "Head straight out on a hiking trail, river, or viewpoint", "category": "adventure"},
            {"key": "C", "label": "Unwind in a serene verandah with tea and a book", "category": "relaxation"},
            {"key": "D", "label": "Chat with the local host to discover hidden neighborhood spots", "category": "connection"},
        ],
    },
    {
        "id": "q2",
        "question": "What kind of homestay environment makes you feel happiest?",
        "options": [
            {"key": "A", "label": "A historic heritage haveli or traditional ancestral home", "category": "culture"},
            {"key": "B", "label": "A remote mountain cabin or hillside cottage surrounded by pines", "category": "adventure"},
            {"key": "C", "label": "A peaceful riverside villa or coastal beach stay with sunset views", "category": "relaxation"},
            {"key": "D", "label": "A warm family-run farm stay with shared homecooked meals", "category": "connection"},
        ],
    },
    {
        "id": "q3",
        "question": "How do you like to spend your afternoons while travelling?",
        "options": [
            {"key": "A", "label": "Visiting ancient temples, artisan workshops, and museum exhibits", "category": "culture"},
            {"key": "B", "label": "Trekking, water sports, cycling, or adrenaline excursions", "category": "adventure"},
            {"key": "C", "label": "Lounging, meditating, taking naps, or swimming", "category": "relaxation"},
            {"key": "D", "label": "Cooking with hosts, learning local folklore, or meeting villagers", "category": "connection"},
        ],
    },
    {
        "id": "q4",
        "question": "What is your philosophy on travel planning?",
        "options": [
            {"key": "A", "label": "Carefully curated itineraries spotlighting local history and architecture", "category": "culture"},
            {"key": "B", "label": "Flexible and spontaneous, chasing scenic landscapes and trails", "category": "adventure"},
            {"key": "C", "label": "Completely slow-paced with zero alarms and maximum leisure", "category": "relaxation"},
            {"key": "D", "label": "Guided by word-of-mouth host recommendations and community tips", "category": "connection"},
        ],
    },
    {
        "id": "q5",
        "question": "What memory from a trip stays with you the longest?",
        "options": [
            {"key": "A", "label": "The profound stories behind local traditions and regional craft", "category": "culture"},
            {"key": "B", "label": "Standing atop a windy peak or navigating an untouched trail", "category": "adventure"},
            {"key": "C", "label": "The deep sense of calm and rejuvenation away from city chaos", "category": "relaxation"},
            {"key": "D", "label": "Heartfelt conversations and laughs shared with hospitable hosts", "category": "connection"},
        ],
    },
]

FALLBACK_PERSONALITIES = {
    "culture": {
        "personality_type": "The Heritage & Culture Connoisseur",
        "tagline": "Drawn to stories, living traditions, and authentic regional history.",
        "traits": [
            "Values deep cultural immersion over tourist traps",
            "Appreciates regional architecture, arts, and culinary roots",
            "Prefers staying in heritage homestays with character",
        ],
        "travel_motto": "Every destination has a soul shaped by its past.",
        "recommended_destinations": ["Jaipur, Rajasthan", "Hampi, Karnataka", "Varanasi, Uttar Pradesh", "Chettinad, Tamil Nadu"],
        "recommended_homestay_styles": ["Heritage Havelis", "Traditional Courtyard Mansions", "Artisan Quarter Lofts"],
    },
    "adventure": {
        "personality_type": "The High-Spirited Explorer",
        "tagline": "Alive in the wild, yearning for open skies and rugged trails.",
        "traits": [
            "Thrives on outdoor exploration, hikes, and scenic vistas",
            "Loves off-the-beaten-path locations and mountain air",
            "Values experiences and stories over luxury amenities",
        ],
        "travel_motto": "The best views come after the hardest climbs.",
        "recommended_destinations": ["Old Manali, Himachal Pradesh", "Rishikesh, Uttarakhand", "Wayanad, Kerala", "Spiti Valley"],
        "recommended_homestay_styles": ["Alpine Wooden Cabins", "Riverside Cottages", "Mountain View Terraces"],
    },
    "relaxation": {
        "personality_type": "The Serene Retreatist",
        "tagline": "Seeking peace, slow mornings, and gentle mindful escapes.",
        "traits": [
            "Travels to recharge mental energy and escape urban pressure",
            "Cherishes calm surroundings, nature sounds, and privacy",
            "Loves comfortable spaces with scenic backdrops",
        ],
        "travel_motto": "Disconnect to reconnect with what matters.",
        "recommended_destinations": ["Kumarakom Backwaters, Kerala", "South Goa Coastal Villages", "Coorg, Karnataka", "Udaipur, Rajasthan"],
        "recommended_homestay_styles": ["Lakeside Farmstays", "Private Pool Villas", "Quiet Orchard Cottages"],
    },
    "connection": {
        "personality_type": "The Soulful Story-Seeker",
        "tagline": "Believes the best souvenir is a friendship made on the road.",
        "traits": [
            "Loves connecting directly with hosts and local families",
            "Passionate about farm-to-table homecooked meals and folklore",
            "Feels most at home in warm, hospitable community homestays",
        ],
        "travel_motto": "Strangers are just friends you haven't shared tea with yet.",
        "recommended_destinations": ["Kumaon Villages, Uttarakhand", "Mawlynnong, Meghalaya", "Kullu Valley", "Konkan Coast"],
        "recommended_homestay_styles": ["Family-Run Farm Stays", "Organic Plantation Stays", "Homestays with Host Dining"],
    },
}

class PersonalitySubmission(BaseModel):
    answers: Dict[str, str]  # e.g., {"q1": "A", "q2": "B", ...}

@router.get("/questions")
async def get_personality_questions():
    """Return the interactive travel personality assessment questions."""
    return {"questions": QUESTIONS}

@router.post("/assess")
async def submit_personality_assessment(
    payload: PersonalitySubmission,
    current_user_id: str = Depends(get_current_user_id),
):
    """
    Submits user answers, calculates travel personality, saves to MongoDB,
    and returns rich insights.
    """
    user = await user_collection.find_one({"_id": ObjectId(current_user_id)}) if ObjectId.is_valid(current_user_id) else None
    if not check_feature_access(user, AI_FEATURE_PERSONALITY):
        raise HTTPException(status_code=403, detail="AI Travel Personality access restricted")

    # Map answers to categories
    category_counts = {"culture": 0, "adventure": 0, "relaxation": 0, "connection": 0}
    question_map = {q["id"]: q for q in QUESTIONS}

    for qid, chosen_key in payload.answers.items():
        if qid in question_map:
            opt = next((o for o in question_map[qid]["options"] if o["key"] == chosen_key), None)
            if opt:
                cat = opt.get("category", "relaxation")
                category_counts[cat] = category_counts.get(cat, 0) + 1

    # Predominant category
    dominant_cat = max(category_counts, key=category_counts.get)
    fallback_data = FALLBACK_PERSONALITIES.get(dominant_cat, FALLBACK_PERSONALITIES["relaxation"])

    personality_result = dict(fallback_data)
    personality_result["category_scores"] = category_counts
    personality_result["ai_enhanced"] = False

    # Enhance with Gemini if API key is configured
    if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
        try:
            prompt = f"""
You are TRACAL's AI Travel Profiler for authentic Indian homestay travel.
A traveller completed a quiz with these category preferences:
- Cultural/Heritage: {category_counts.get('culture', 0)} / 5
- Adventure/Nature: {category_counts.get('adventure', 0)} / 5
- Relaxation/Wellness: {category_counts.get('relaxation', 0)} / 5
- Human Connection/Community: {category_counts.get('connection', 0)} / 5

Dominant Archetype: {fallback_data['personality_type']}

Provide a personalized travel profile JSON with:
1. "personality_type": A compelling 3-4 word title.
2. "tagline": A vibrant 1-sentence description of how they travel.
3. "traits": Array of 3 distinct behavioral traits.
4. "travel_motto": A memorable inspiring quote.
5. "recommended_destinations": Array of 4 Indian destinations (City/Region, State).
6. "recommended_homestay_styles": Array of 3 homestay types they would love.

Output ONLY valid JSON without Markdown backticks.
"""
            primary_model = getattr(settings, "GEMINI_MODEL", "gemini-3.5-flash")
            fallback_model = getattr(settings, "GEMINI_FALLBACK_MODEL", "gemini-3.5-flash-lite")
            models_to_try = [primary_model, fallback_model]
            api_key = settings.GEMINI_API_KEY.strip()

            async with httpx.AsyncClient(timeout=10.0) as client:
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
                            # Clean code fence if present
                            cleaned_text = text_val.strip()
                            if cleaned_text.startswith("```json"):
                                cleaned_text = cleaned_text[7:]
                            if cleaned_text.startswith("```"):
                                cleaned_text = cleaned_text[3:]
                            if cleaned_text.endswith("```"):
                                cleaned_text = cleaned_text[:-3]
                            parsed = json.loads(cleaned_text.strip())
                            personality_result["personality_type"] = parsed.get("personality_type", personality_result["personality_type"])
                            personality_result["tagline"] = parsed.get("tagline", personality_result["tagline"])
                            personality_result["traits"] = parsed.get("traits", personality_result["traits"])
                            personality_result["travel_motto"] = parsed.get("travel_motto", personality_result["travel_motto"])
                            personality_result["recommended_destinations"] = parsed.get("recommended_destinations", personality_result["recommended_destinations"])
                            personality_result["recommended_homestay_styles"] = parsed.get("recommended_homestay_styles", personality_result["recommended_homestay_styles"])
                            personality_result["ai_enhanced"] = True
                            break
        except Exception:
            # Gracefully fallback to deterministic algorithm
            pass

    record = {
        "userId": current_user_id,
        "answers": payload.answers,
        "result": personality_result,
        "createdAt": datetime.now(timezone.utc),
    }

    insert_res = await personality_assessments_collection.insert_one(record)
    personality_result["id"] = str(insert_res.inserted_id)
    personality_result["created_at"] = record["createdAt"].isoformat()

    return personality_result

@router.get("/history")
async def get_personality_history(current_user_id: str = Depends(get_current_user_id)):
    """Retrieve all past personality assessment results for the authenticated user."""
    cursor = personality_assessments_collection.find({"userId": current_user_id}).sort("createdAt", -1).limit(10)
    history = []
    async for doc in cursor:
        doc["id"] = str(doc.pop("_id"))
        if "createdAt" in doc:
            doc["created_at"] = doc["createdAt"].isoformat() if hasattr(doc["createdAt"], "isoformat") else str(doc["createdAt"])
        history.append(doc)
    return {"history": history}

