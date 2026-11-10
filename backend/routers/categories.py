from fastapi import APIRouter
from ..categories import CATEGORIES
from pydantic import BaseModel
from typing import List

router = APIRouter()

class CategoryResponse(BaseModel):
    slug: str
    label: str

@router.get("/", response_model=List[CategoryResponse])
async def get_categories():
    """Return the canonical list of homestay categories.
    The frontend uses this endpoint to populate dropdowns and tiles.
    """
    return [CategoryResponse(slug=c.slug, label=c.label) for c in CATEGORIES]

