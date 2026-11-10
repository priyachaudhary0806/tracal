"""
OpenStreetMap-based Local Explorer for TRACAL.
Replaces proprietary Google Places API with OpenStreetMap data via Overpass API and Nominatim.
100% free with no API keys or billing required.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List, Dict, Any
from bson import ObjectId
import httpx
import math
import urllib.parse
import asyncio
import logging

from ..database import homestay_collection, user_collection
from ..routers.deps import get_optional_user_id
from ..services.feature_access import check_feature_access, AI_FEATURE_LOCAL_EXPLORER

router = APIRouter()
logger = logging.getLogger(__name__)

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_SERVERS = [
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

USER_AGENT = "Tracal-Homestays/1.0 (contact: support@tracal.com)"

CATEGORY_CONFIG = {
    "restaurants": {
        "label": "Restaurants & Dining",
        "overpass_filter": """node["amenity"~"restaurant|fast_food|food_court"](around:{radius},{lat},{lon});""",
        "nominatim_prefix": "restaurant in",
    },
    "hospitals": {
        "label": "Hospitals & Medical",
        "overpass_filter": """node["amenity"~"hospital|clinic|pharmacy"](around:{radius},{lat},{lon});""",
        "nominatim_prefix": "hospital in",
    },
    "attractions": {
        "label": "Tourist Attractions",
        "overpass_filter": """node["tourism"~"attraction|viewpoint|museum|artwork"](around:{radius},{lat},{lon});""",
        "nominatim_prefix": "attractions in",
    },
    "cafes": {
        "label": "Cafes & Bakeries",
        "overpass_filter": """node["amenity"="cafe"](around:{radius},{lat},{lon});""",
        "nominatim_prefix": "cafe in",
    },
    "atms": {
        "label": "ATMs & Banking",
        "overpass_filter": """node["amenity"~"atm|bank"](around:{radius},{lat},{lon});""",
        "nominatim_prefix": "bank in",
    },
    "shopping": {
        "label": "Shopping & Markets",
        "overpass_filter": """node["shop"](around:{radius},{lat},{lon});""",
        "nominatim_prefix": "market in",
    },
}

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance between two points in meters using the Haversine formula."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

def format_distance(meters: float) -> str:
    """Formats distance nicely into meters or kilometers."""
    if meters < 1000:
        return f"{int(round(meters))} m"
    return f"{meters / 1000.0:.1f} km"

async def geocode_destination(destination: str, client: httpx.AsyncClient) -> Optional[Dict[str, Any]]:
    """Geocodes a destination name using OpenStreetMap Nominatim."""
    try:
        resp = await client.get(
            NOMINATIM_SEARCH_URL,
            params={
                "q": destination.strip(),
                "format": "json",
                "limit": 1,
                "addressdetails": 1,
            },
            headers={"User-Agent": USER_AGENT},
        )
        if resp.status_code == 200:
            results = resp.json()
            if results and len(results) > 0:
                item = results[0]
                return {
                    "lat": float(item["lat"]),
                    "lon": float(item["lon"]),
                    "display_name": item.get("display_name", destination),
                }
    except Exception as exc:
        logger.warning(f"Nominatim geocoding error for '{destination}': {exc}")
    return None

async def query_overpass_places(
    lat: float,
    lon: float,
    category_key: str,
    client: httpx.AsyncClient,
    radius: int = 5000,
) -> List[Dict[str, Any]]:
    """Queries OpenStreetMap Overpass API for genuine nearby points of interest."""
    cat_conf = CATEGORY_CONFIG.get(category_key, CATEGORY_CONFIG["attractions"])
    filter_body = cat_conf["overpass_filter"].format(radius=radius, lat=lat, lon=lon)
    overpass_query = f"""[out:json][timeout:4];
(
  {filter_body}
);
out body 15;
"""
    for server_url in OVERPASS_SERVERS[:2]:
        try:
            resp = await client.post(
                server_url,
                data={"data": overpass_query},
                headers={"User-Agent": USER_AGENT},
                timeout=3.5,
            )
            if resp.status_code == 200:
                data = resp.json()
                elements = data.get("elements", [])
                places = []
                for el in elements:
                    tags = el.get("tags", {})
                    name = tags.get("name") or tags.get("name:en")
                    if not name:
                        continue  # Do not include unnamed nodes
                    el_lat = el.get("lat") or el.get("center", {}).get("lat")
                    el_lon = el.get("lon") or el.get("center", {}).get("lon")
                    if el_lat is None or el_lon is None:
                        continue

                    dist_m = haversine_distance_meters(lat, lon, float(el_lat), float(el_lon))
                    address_parts = [tags.get(k) for k in ("addr:street", "addr:suburb", "addr:city") if tags.get(k)]
                    address_str = ", ".join(address_parts) if address_parts else f"Coordinates: {el_lat:.4f}, {el_lon:.4f}"

                    places.append({
                        "name": name,
                        "category": cat_conf["label"],
                        "lat": float(el_lat),
                        "lon": float(el_lon),
                        "distance_meters": dist_m,
                        "distance": format_distance(dist_m),
                        "address": address_str,
                        "source": "OpenStreetMap",
                        "maps_url": f"https://www.openstreetmap.org/?mlat={el_lat}&mlon={el_lon}#map=17/{el_lat}/{el_lon}",
                        "directions_url": f"https://www.google.com/maps/search/?api=1&query={el_lat},{el_lon}",
                    })

                if places:
                    places.sort(key=lambda x: x["distance_meters"])
                    return places[:12]
        except Exception as exc:
            logger.debug(f"Overpass mirror {server_url} failed: {exc}")
            continue

    return []

async def query_nominatim_places(
    destination: str,
    dest_lat: float,
    dest_lon: float,
    category_key: str,
    client: httpx.AsyncClient,
) -> List[Dict[str, Any]]:
    """Fallback query to Nominatim location search for genuine places in the destination."""
    cat_conf = CATEGORY_CONFIG.get(category_key, CATEGORY_CONFIG["attractions"])
    dest_name = destination.split(",")[0].strip() if destination else destination
    search_query = f"{cat_conf['nominatim_prefix']} {dest_name}"

    try:
        resp = await client.get(
            NOMINATIM_SEARCH_URL,
            params={
                "q": search_query,
                "format": "json",
                "limit": 12,
                "addressdetails": 1,
            },
            headers={"User-Agent": USER_AGENT},
            timeout=5.0,
        )
        if resp.status_code == 200:
            items = resp.json()
            places = []
            for it in items:
                try:
                    p_lat = float(it["lat"])
                    p_lon = float(it["lon"])
                except (ValueError, KeyError):
                    continue

                raw_name = it.get("name")
                if not raw_name:
                    display_parts = it.get("display_name", "").split(",")
                    raw_name = display_parts[0].strip() if display_parts else "Point of Interest"

                dist_m = haversine_distance_meters(dest_lat, dest_lon, p_lat, p_lon)
                places.append({
                    "name": raw_name,
                    "category": cat_conf["label"],
                    "lat": p_lat,
                    "lon": p_lon,
                    "distance_meters": dist_m,
                    "distance": format_distance(dist_m),
                    "address": it.get("display_name", f"{p_lat:.4f}, {p_lon:.4f}"),
                    "source": "OpenStreetMap",
                    "maps_url": f"https://www.openstreetmap.org/?mlat={p_lat}&mlon={p_lon}#map=17/{p_lat}/{p_lon}",
                    "directions_url": f"https://www.google.com/maps/search/?api=1&query={p_lat},{p_lon}",
                })

            places.sort(key=lambda x: x["distance_meters"])
            return places
    except Exception as exc:
        logger.warning(f"Nominatim places search error: {exc}")

    return []

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@router.get("/status")
async def get_explorer_status(optional_user_id: Optional[str] = Depends(get_optional_user_id)):
    """Check OpenStreetMap Local Explorer status. 100% free with no API keys required."""
    return {
        "feature": "Local Explorer",
        "configured": True,
        "provider": "OpenStreetMap",
        "status": "ready",
        "available_categories": list(CATEGORY_CONFIG.keys()),
        "message": "OpenStreetMap Local Explorer is active and ready. Powered by Overpass API & Nominatim with 0 API keys required.",
    }

@router.get("/nearby")
async def explore_nearby(
    destination: str = Query(..., description="City, region, or area name"),
    category: str = Query(default="attractions", description="restaurants | hospitals | attractions | cafes | atms | shopping"),
    optional_user_id: Optional[str] = Depends(get_optional_user_id),
):
    """
    Search for genuine nearby points of interest via OpenStreetMap (Overpass API + Nominatim).
    Returns real places, computed distances, and interactive map links.
    """
    user = (
        await user_collection.find_one({"_id": ObjectId(optional_user_id)})
        if optional_user_id and ObjectId.is_valid(optional_user_id)
        else None
    )
    if not check_feature_access(user, AI_FEATURE_LOCAL_EXPLORER):
        raise HTTPException(status_code=403, detail="Local Explorer feature access restricted")

    clean_dest = destination.strip()
    if not clean_dest:
        raise HTTPException(status_code=400, detail="Destination cannot be empty")

    cat_key = category.strip().lower()
    if cat_key not in CATEGORY_CONFIG:
        cat_key = "attractions"

    cat_label = CATEGORY_CONFIG[cat_key]["label"]

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Step 1: Geocode destination using Nominatim
        center = await geocode_destination(clean_dest, client)
        if not center:
            return {
                "status": "no_match",
                "configured": True,
                "provider": "OpenStreetMap",
                "destination": clean_dest,
                "category": cat_key,
                "category_label": cat_label,
                "places": [],
                "message": f"Could not find geographic coordinates for '{clean_dest}'. Please verify the spelling or try adding a state name (e.g. 'Manali, Himachal Pradesh').",
            }

        dest_lat = center["lat"]
        dest_lon = center["lon"]

        # Step 2: Try Overpass API for rich tagged node data
        places = await query_overpass_places(dest_lat, dest_lon, cat_key, client)

        # Step 3: If Overpass times out or has 0 results, fallback to Nominatim location search
        if not places:
            places = await query_nominatim_places(clean_dest, dest_lat, dest_lon, cat_key, client)

        if not places:
            return {
                "status": "empty",
                "configured": True,
                "provider": "OpenStreetMap",
                "destination": clean_dest,
                "category": cat_key,
                "category_label": cat_label,
                "center": center,
                "places": [],
                "count": 0,
                "message": f"No {cat_label.lower()} found in OpenStreetMap around {clean_dest}. Try another category or a broader destination.",
            }

        return {
            "status": "success",
            "configured": True,
            "provider": "OpenStreetMap",
            "destination": clean_dest,
            "category": cat_key,
            "category_label": cat_label,
            "center": center,
            "places": places,
            "count": len(places),
            "message": f"Found {len(places)} real {cat_label.lower()} in {clean_dest} via OpenStreetMap.",
        }

@router.get("/homestay/{homestay_id}")
async def explore_for_homestay(
    homestay_id: str,
    category: str = Query(default="attractions"),
    optional_user_id: Optional[str] = Depends(get_optional_user_id),
):
    """Fetch nearby places for a specific homestay by its registered address or title."""
    try:
        hs = await homestay_collection.find_one({"_id": ObjectId(homestay_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid homestay ID")

    if not hs:
        raise HTTPException(status_code=404, detail="Homestay not found")

    dest = hs.get("address") or hs.get("title")
    return await explore_nearby(destination=dest, category=category, optional_user_id=optional_user_id)
