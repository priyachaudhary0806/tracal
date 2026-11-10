from fastapi import APIRouter, UploadFile, File, Depends
import os
import uuid
import shutil
from PIL import Image

from .deps import get_current_user_id

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_image(
    file: UploadFile = File(...),
    _user_id: str = Depends(get_current_user_id),   # auth required — unauthenticated uploads rejected
):
    filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    try:
        # Open file as image
        img = Image.open(file.file)
        
        # Resize if width or height > 1200
        max_size = 1200
        width, height = img.size
        if width > max_size or height > max_size:
            if width > height:
                new_width = max_size
                new_height = int(height * (max_size / width))
            else:
                new_height = max_size
                new_width = int(width * (max_size / height))
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext == '.png':
            img.save(file_path, format="PNG", optimize=True)
        else:
            if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                bg = Image.new('RGB', img.size, (255, 255, 255))
                # Get alpha mask
                alpha = img.split()[3] if img.mode == 'RGBA' else img.convert('RGBA').split()[3]
                bg.paste(img, mask=alpha)
                img = bg
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            img.save(file_path, format="JPEG", quality=80, optimize=True)
    except Exception as e:
        # Fallback to copy raw file
        file.file.seek(0)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
    return {"url": f"http://localhost:8000/uploads/{filename}"}
