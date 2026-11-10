from pydantic import BaseModel
from typing import List

class Category(BaseModel):
    slug: str
    label: str

# Canonical category list – single source of truth for backend
CATEGORIES: List[Category] = [
    Category(slug="beach", label="Beach"),
    Category(slug="city", label="City"),
    Category(slug="mountain", label="Mountain"),
    Category(slug="village", label="Village"),
]

