from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .settings import settings
import os

# Load backend/.env automatically if python-dotenv is installed.
# Install with: pip install python-dotenv
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(__file__), ".env")
    load_dotenv(_env_path)
except ImportError:
    pass  # python-dotenv not installed — env vars must be set in the shell

from .routers import (
    auth,
    homestays,
    upload,
    bookings,
    enquiries,
    categories,
    reviews,
    notifications,
    availability,
    host_verification,
    admin,
    subscriptions,
    trustscore,
    budget_planner,
    personality,
    local_explorer,
    review_intelligence,
    reality_check,
)

app = FastAPI(title="Tracal API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS.split(",") if settings.ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router,              prefix="/api/auth",              tags=["Auth"])
app.include_router(homestays.router,         prefix="/api/homestays",         tags=["Homestays"])
app.include_router(upload.router,            prefix="/api/upload",            tags=["Upload"])
app.include_router(bookings.router,          prefix="/api/bookings",          tags=["Bookings"])
app.include_router(enquiries.router,         prefix="/api/enquiries",         tags=["Enquiries"])
app.include_router(categories.router,        prefix="/api/categories",        tags=["Categories"])
app.include_router(reviews.router,           prefix="/api/reviews",           tags=["Reviews"])
app.include_router(notifications.router,     prefix="/api/notifications",     tags=["Notifications"])
app.include_router(availability.router,      prefix="/api/availability",      tags=["Availability"])
app.include_router(host_verification.router, prefix="/api/host-verification", tags=["Host Verification"])
app.include_router(admin.router,            prefix="/api/admin",            tags=["Admin"])
app.include_router(subscriptions.router,              prefix="/api/subscriptions",              tags=["Subscriptions"])
app.include_router(trustscore.router, prefix="/api/trustscore", tags=["TrustScore"])
app.include_router(budget_planner.router,        prefix="/api/budget-planner",        tags=["Budget Planner"])
app.include_router(personality.router,           prefix="/api/personality",           tags=["AI Travel Personality"])
app.include_router(local_explorer.router,        prefix="/api/local-explorer",        tags=["Local Explorer"])
app.include_router(review_intelligence.router,   prefix="/api/review-intelligence",   tags=["AI Review Intelligence"])
app.include_router(reality_check.router,         prefix="/api/reality-check",         tags=["Reality Check"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Tracal API"}
