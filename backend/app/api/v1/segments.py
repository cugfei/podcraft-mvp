"""Podcast segment CRUD + reorder + synthesis routes — real JWT auth."""

from typing import List, Optional
import os
import threading
import wave

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pathlib import Path
from sqlalchemy.orm import Session

from app.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.podcast import PodcastProject, PodcastScript, PodcastRole
from app.models.segment import PodcastSegment

router = APIRouter()
security = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
AUDIO_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_current_active_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_session),
) -> User:
    user = get_current_user(creds, db)
    return user


def _get_project(project_id: str, user: User, db: Session) -> PodcastProject:
    project = (
        db.query(PodcastProject)
        .filter(PodcastProject.id == project_id, PodcastProject.user_id == user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Podcast not found")
    return project


def _get_script(project_id: str, db: Session) -> PodcastScript:
    script = (
        db.query(PodcastScript)
        .filter(PodcastScript.project_id == project_id)
        .first()
    )
    if not script:
        from datetime import datetime
        now = datetime.utcnow()
        script = PodcastScript(
            project_id=project_id,
            status="draft",
            created_at=now,
            updated_at=now,
        )
        db.add(script)
        db.flush()
    return script


def _get_role(project_id: str, role_key: str, db: Session) -> PodcastRole:
    role = (
        db.query(PodcastRole)
        .filter(
            PodcastRole.project_id == project_id,
            PodcastRole.role_key == role_key,
        )
        .first()
    )
    if not role:
        raise HTTPException(status_code=404, detail=f"Role '{role_key}' not found")
    return role


# ---------------------------------------------------------------------------
# Mock synthesis helpers
# ---------------------------------------------------------------------------

def _generate_silence_wav(filepath: str, duration_s: int):
    """Generate a valid WAV file with silence."""
    sample_rate = 22050
    num_samples = sample_rate * duration_s
    with wave.open(filepath, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)   # 16-bit
        wav.setframerate(sample_rate)
        wav.writeframes(b"\x00\x00" * num_samples)


def _mock_synthesize(segment_id: str):
    """Background thread: mock TTS → generate WAV → update DB."""
    from app.database import SessionLocal
    from app.models.segment import PodcastSegment
    from app.models.audio_asset import AudioAsset
    from datetime import datetime, timezone

    db = SessionLocal()
    try:
        seg = db.query(PodcastSegment).filter(PodcastSegment.id == segment_id).first()
        if not seg:
            return

        # Mark synthesizing
        seg.status = "synthesizing"
        seg.updated_at = datetime.now(timezone.utc)
        db.commit()

        # Generate mock WAV (silence, ~1s per 10 chars)
        duration_s = max(1, len(seg.text or "") // 10)
        filename = f"seg_{segment_id}.wav"
        filepath = AUDIO_DIR / filename
        _generate_silence_wav(str(filepath), duration_s)

        file_size = filepath.stat().st_size
        now = datetime.now(timezone.utc)

        # Create or update AudioAsset
        asset = None
        if seg.audio_asset_id:
            asset = db.query(AudioAsset).filter(AudioAsset.id == seg.audio_asset_id).first()
        if not asset:
            asset = AudioAsset(
                project_id=seg.script.project_id if seg.script else None,
                segment_id=seg.id,
                type="segment",
                format="wav",
                duration_ms=duration_s * 1000,
                file_size=file_size,
                url=f"/static/audio/{filename}",
                created_at=now,
            )
            db.add(asset)
            db.flush()
            seg.audio_asset_id = asset.id
        else:
            asset.url = f"/static/audio/{filename}"
            asset.file_size = file_size
            asset.duration_ms = duration_s * 1000
            asset.updated_at = now

        seg.status = "completed"
        seg.updated_at = now
        db.commit()
    except Exception as e:
        db.rollback()
        try:
            seg = db.query(PodcastSegment).filter(PodcastSegment.id == segment_id).first()
            if seg:
                seg.status = "failed"
                seg.error_message = str(e)[:500]
                seg.updated_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
from pydantic import BaseModel


class SegmentCreate(BaseModel):
    role_key: str = "host"
    text: str
    emotion: Optional[str] = None
    pause_after_ms: int = 700


class SegmentUpdate(BaseModel):
    text: Optional[str] = None
    emotion: Optional[str] = None
    pause_after_ms: Optional[int] = None
    sort_order: Optional[int] = None


class ReorderRequest(BaseModel):
    segment_ids: List[str]  # ordered list of segment IDs


# ---------------------------------------------------------------------------
# List segments
# ---------------------------------------------------------------------------
@router.get("/podcasts/{project_id}/segments")
def list_segments(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    project = _get_project(project_id, current_user, db)
    script = _get_script(project_id, db)
    segments = (
        db.query(PodcastSegment)
        .filter(PodcastSegment.script_id == script.id)
        .order_by(PodcastSegment.sort_order)
        .all()
    )
    return {
        "code": 0,
        "data": [s.to_dict(deep=True) for s in segments],
        "message": "ok",
    }


# ---------------------------------------------------------------------------
# Create segment
# ---------------------------------------------------------------------------
@router.post("/podcasts/{project_id}/segments")
def create_segment(
    project_id: str,
    body: SegmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    project = _get_project(project_id, current_user, db)
    script = _get_script(project_id, db)
    role = _get_role(project_id, body.role_key, db)

    from datetime import datetime
    now = datetime.utcnow()

    # Get next sort_order
    max_seg = (
        db.query(PodcastSegment)
        .filter(PodcastSegment.script_id == script.id)
        .order_by(PodcastSegment.sort_order.desc())
        .first()
    )
    next_order = (max_seg.sort_order + 1) if max_seg else 0

    seg = PodcastSegment(
        script_id=script.id,
        role_id=role.id,
        sort_order=next_order,
        text=body.text,
        emotion=body.emotion,
        pause_after_ms=body.pause_after_ms,
        char_count=len(body.text),
        status="draft",
        created_at=now,
        updated_at=now,
    )
    db.add(seg)
    db.commit()
    return {"code": 0, "data": seg.to_dict(), "message": "ok"}


# ---------------------------------------------------------------------------
# Update segment
# ---------------------------------------------------------------------------
@router.put("/segments/{segment_id}")
def update_segment(
    segment_id: str,
    body: SegmentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    seg = (
        db.query(PodcastSegment)
        .join(PodcastScript)
        .join(PodcastProject)
        .filter(
            PodcastSegment.id == segment_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")

    from datetime import datetime
    seg.updated_at = datetime.utcnow()
    if body.text is not None:
        seg.text = body.text
        seg.char_count = len(body.text)
        seg.status = "draft"
    if body.emotion is not None:
        seg.emotion = body.emotion
    if body.pause_after_ms is not None:
        seg.pause_after_ms = body.pause_after_ms
    if body.sort_order is not None:
        seg.sort_order = body.sort_order

    db.commit()
    return {"code": 0, "data": seg.to_dict(), "message": "ok"}


# ---------------------------------------------------------------------------
# Delete segment
# ---------------------------------------------------------------------------
@router.delete("/segments/{segment_id}")
def delete_segment(
    segment_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    seg = (
        db.query(PodcastSegment)
        .join(PodcastScript)
        .join(PodcastProject)
        .filter(
            PodcastSegment.id == segment_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")

    db.delete(seg)

    # Reorder remaining segments
    script = seg.script
    remaining = (
        db.query(PodcastSegment)
        .filter(PodcastSegment.script_id == script.id)
        .order_by(PodcastSegment.sort_order)
        .all()
    )
    for i, s in enumerate(remaining):
        s.sort_order = i

    db.commit()
    return {"code": 0, "data": None, "message": "deleted"}


# ---------------------------------------------------------------------------
# Reorder segments
# ---------------------------------------------------------------------------
@router.post("/podcasts/{project_id}/segments/reorder")
def reorder_segments(
    project_id: str,
    body: ReorderRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    project = _get_project(project_id, current_user, db)
    script = _get_script(project_id, db)

    # Validate all segment IDs belong to this script
    segments = (
        db.query(PodcastSegment)
        .filter(
            PodcastSegment.script_id == script.id,
            PodcastSegment.id.in_(body.segment_ids),
        )
        .all()
    )
    if len(segments) != len(body.segment_ids):
        raise HTTPException(status_code=400, detail="Some segment IDs are invalid")

    from datetime import datetime
    now = datetime.utcnow()

    seg_map = {s.id: s for s in segments}
    for i, sid in enumerate(body.segment_ids):
        seg = seg_map.get(sid)
        if seg:
            seg.sort_order = i
            seg.updated_at = now

    db.commit()
    # Return updated list
    updated = (
        db.query(PodcastSegment)
        .filter(PodcastSegment.script_id == script.id)
        .order_by(PodcastSegment.sort_order)
        .all()
    )
    return {
        "code": 0,
        "data": [s.to_dict() for s in updated],
        "message": "ok",
    }


# ---------------------------------------------------------------------------
# Trigger TTS synthesis for a single segment
# ---------------------------------------------------------------------------
@router.post("/segments/{segment_id}/synthesize")
def synthesize_segment(
    segment_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    """Queue a single segment for TTS synthesis."""
    seg = (
        db.query(PodcastSegment)
        .join(PodcastScript)
        .join(PodcastProject)
        .filter(
            PodcastSegment.id == segment_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")

    # Check if already completed recently
    if seg.status == "completed" and seg.audio_asset_id:
        return {"code": 0, "data": {"status": "completed", "already_done": True}, "message": "already completed"}

    # Mark as queued
    from datetime import datetime, timezone
    seg.status = "queued"
    seg.error_message = None
    seg.updated_at = datetime.now(timezone.utc)
    db.commit()

    # Launch background thread (MVP mock; Phase 4 will use Celery)
    t = threading.Thread(target=_mock_synthesize, args=(segment_id,), daemon=True)
    t.start()

    return {"code": 0, "data": {"status": "queued"}, "message": "synthesis queued"}
