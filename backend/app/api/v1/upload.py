"""File upload routes."""

import os
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.audio_asset import AudioAsset

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload/audio")
async def upload_audio(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Upload an audio file (reference, background music, etc.)."""
    # Validate file type
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="File must be an audio file")
    
    # Read file content
    content = await file.read()
    
    # Save file
    filename = f"{current_user.id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create AudioAsset record
    from datetime import datetime
    asset = AudioAsset(
        user_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        file_size=len(content),
        mime_type=file.content_type,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    
    return {"code": 0, "data": {"id": asset.id, "filename": asset.filename, "file_path": asset.file_path}, "message": "ok"}
