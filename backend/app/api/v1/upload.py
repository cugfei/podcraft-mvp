"""File upload routes — audio assets, etc."""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.audio_asset import AudioAsset
from app.utils.response import success, error

settings = get_settings()
router = APIRouter(prefix="/upload", tags=["upload"])
security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_authenticated_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_session),
) -> User:
    """Validate Bearer token and return the User, or raise 401."""
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    from app.core.security import decode_access_token
    payload = decode_access_token(creds.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    user: Optional[User] = (
        db.query(User).filter(User.id == user_id).first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    return user


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/audio", response_model=dict)
async def upload_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(_get_authenticated_user),
    db: Session = Depends(get_session),
) -> dict:
    """Upload an audio file (reference, background music, etc.).
    
    Returns: ``{id, filename, file_path}``
    """
    if not file.filename:
        return error(400, "No file provided")

    # Validate file type
    allowed_types = {"audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"}
    if file.content_type not in allowed_types:
        return error(400, f"Unsupported file type: {file.content_type}")

    # Save file (simplified — save to local uploads dir)
    import os
    from datetime import datetime
    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{current_user.id}{ext}"
    file_path = os.path.join(uploads_dir, unique_name)

    # Save file
    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Create AudioAsset record
    asset = AudioAsset(
        user_id=current_user.id,
        filename=unique_name,
        file_path=file_path,
        file_size=len(contents),
        mime_type=file.content_type,
        duration_seconds=None,  # TODO: extract with ffprobe
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    return success({
        "id": asset.id,
        "filename": unique_name,
        "file_path": file_path,
    })


@router.get("/audio/{asset_id}", response_model=dict)
def get_audio_asset(
    asset_id: str,
    current_user: User = Depends(_get_authenticated_user),
    db: Session = Depends(get_session),
) -> dict:
    """Get audio asset metadata."""
    asset = (
        db.query(AudioAsset)
        .filter(
            AudioAsset.id == asset_id,
            AudioAsset.user_id == current_user.id,
        )
        .first()
    )
    if not asset:
        return error(404, "Asset not found")
    return success({
        "id": asset.id,
        "filename": asset.filename,
        "file_path": asset.file_path,
        "file_size": asset.file_size,
        "mime_type": asset.mime_type,
        "duration_seconds": asset.duration_seconds,
        "created_at": asset.created_at.isoformat() if asset.created_at else None,
    })


@router.delete("/audio/{asset_id}", response_model=dict)
def delete_audio_asset(
    asset_id: str,
    current_user: User = Depends(_get_authenticated_user),
    db: Session = Depends(get_session),
) -> dict:
    """Delete an audio asset."""
    asset = (
        db.query(AudioAsset)
        .filter(
            AudioAsset.id == asset_id,
            AudioAsset.user_id == current_user.id,
        )
        .first()
    )
    if not asset:
        return error(404, "Asset not found")

    # Delete file from disk
    import os
    if os.path.exists(asset.file_path):
        os.remove(asset.file_path)

    db.delete(asset)
    db.commit()
    return success(None, message="deleted")
