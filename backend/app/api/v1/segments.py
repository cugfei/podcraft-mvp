"""Podcast segment CRUD + reorder routes."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.podcast import PodcastProject, PodcastScript, PodcastRole
from app.models.segment import PodcastSegment

router = APIRouter()


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
# Helpers
# ---------------------------------------------------------------------------
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
        script = PodcastScript(
            project_id=project_id,
            status="draft",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
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
# List segments
# ---------------------------------------------------------------------------
@router.get("/podcasts/{project_id}/segments")
def list_segments(
    project_id: str,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    project = _get_project(project_id, user, db)
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
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    project = _get_project(project_id, user, db)
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
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    seg = (
        db.query(PodcastSegment)
        .join(PodcastScript)
        .join(PodcastProject)
        .filter(PodcastSegment.id == segment_id, PodcastProject.user_id == user.id)
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
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    seg = (
        db.query(PodcastSegment)
        .join(PodcastScript)
        .join(PodcastProject)
        .filter(PodcastSegment.id == segment_id, PodcastProject.user_id == user.id)
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
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    project = _get_project(project_id, user, db)
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
# Trigger TTS synthesis for a single segment (preview)
# ---------------------------------------------------------------------------
@router.post("/segments/{segment_id}/synthesize")
def synthesize_segment(
    segment_id: str,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    """Queue a single segment for TTS synthesis (preview)."""
    seg = (
        db.query(PodcastSegment)
        .join(PodcastScript)
        .join(PodcastProject)
        .filter(PodcastSegment.id == segment_id, PodcastProject.user_id == user.id)
        .first()
    )
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")

    # Update status to queued
    from datetime import datetime
    seg.status = "queued"
    seg.updated_at = datetime.utcnow()
    db.commit()

    # TODO: Actually queue Celery task here
    # For now, just return accepted
    return {"code": 0, "data": {"status": "queued"}, "message": "synthesis queued"}
