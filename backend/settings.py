from pydantic_settings import BaseSettings
from pydantic import Field, ConfigDict
import os

class Settings(BaseSettings):
    """Application configuration loaded from environment variables.
    Production must provide all required secrets. Development can use a local .env file.
    """
    # JWT configuration – falls back to a dev default so the server starts locally
    JWT_SECRET_KEY: str = Field(default="TRACAL_SECRET_KEY_CHANGE_IN_PRODUCTION", env="JWT_SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # MongoDB connection string
    MONGO_DETAILS: str = Field(default="mongodb://localhost:27017", env="MONGODB_URI")

    # CORS / allowed origins – comma‑separated list. Empty = allow all (dev only).
    ALLOWED_ORIGINS: str = ""

    # Email configuration (used by backend/email.py)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = ""

    # Admin Seed Credentials
    ADMIN_EMAIL: str = Field(default="", env="ADMIN_EMAIL")
    ADMIN_PASSWORD: str = Field(default="", env="ADMIN_PASSWORD")

    # External AI & Places API Keys
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")
    GEMINI_MODEL: str = Field(default="gemini-3.5-flash", env="GEMINI_MODEL")
    GEMINI_FALLBACK_MODEL: str = Field(default="gemini-3.5-flash-lite", env="GEMINI_FALLBACK_MODEL")
    GOOGLE_PLACES_API_KEY: str = Field(default="", env="GOOGLE_PLACES_API_KEY")

    # Razorpay credentials (optional for dev, required for production)
    RAZORPAY_KEY_ID: str = Field(default="", env="RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET: str = Field(default="", env="RAZORPAY_KEY_SECRET")
    # Plan prices in INR (paise conversion is done at runtime). JSON format allows easy overrides.
    # Example: {"pro_monthly": 99, "pro_quarterly": 249, "premium_yearly": 699}
    PLAN_PRICES_JSON: str = Field(default="{\"pro_monthly\": 99, \"pro_quarterly\": 249, \"premium_yearly\": 699}", env="PLAN_PRICES_JSON")
    # Helper to parse plan prices into a dict (cached property)
    @property
    def PLAN_PRICES(self) -> dict:
        try:
            import json
            return json.loads(self.PLAN_PRICES_JSON)
        except Exception:
            # Fallback to defaults if parsing fails
            return {"pro_monthly": 99, "pro_quarterly": 249, "premium_yearly": 699}

    # Load from backend/.env (the file that actually exists in this project)
    model_config = ConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",   # ignore unknown env vars (e.g. MONGODB_URI extras)
    )

# Export a singleton for easy import throughout the project
settings = Settings()
