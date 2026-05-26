"""Podcast project CRUD routes — real JWT auth."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.podcast import PodcastProject, PodcastScript, PodcastRole

router = APIRouter()


# ---------------------------------------------------------------------------
# Pydantic schemas (inline for simplicity)
# ---------------------------------------------------------------------------
from pydantic import BaseModel


class PodcastCreate(BaseModel):
    title: str
    mode: str = "solo"
    style: str = "professional"
    target_duration: Optional[int] = None


class PodcastUpdate(BaseModel):
    title: Optional[str] = None
    mode: Optional[str] = None
    style: Optional[str] = None
    target_duration: Optional[int] = None
    status: Optional[str] = None


class RoleCreate(BaseModel):
    role_key: str
    name: str
    persona: Optional[str] = None
    voice_id: Optional[str] = None
    speed: float = 1.0
    pitch: float = 0.0
    volume: float = 1.0
    color: Optional[str] = None


class ScriptUpdate(BaseModel):
    outline: Optional[str] = None
    script_content: Optional[str] = None


# ---------------------------------------------------------------------------
# List podcasts
# ---------------------------------------------------------------------------
@router.get("/list")
def list_podcasts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    query = db.query(PodcastProject).filter(
        PodcastProject.user_id == current_user.id
    )
    if status:
        query = query.filter(PodcastProject.status == status)
    total = query.count()
    items = (
        query.order_by(PodcastProject.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "code": 0,
        "data": {
            "items": [p.to_dict() for p in items],
            "total": total,
            "skip": skip,
            "limit": limit,
        },
        "message": "ok",
    }


# ---------------------------------------------------------------------------
# Create podcast
# ---------------------------------------------------------------------------
@router.post("/")
def create_podcast(
    body: PodcastCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    from datetime import datetime
    now = datetime.utcnow()

    project = PodcastProject(
        user_id=current_user.id,
        title=body.title,
        mode=body.mode,
        style=body.style,
        target_duration=body.target_duration,
        status="draft",
        created_at=now,
        updated_at=now,
    )
    db.add(project)
    db.flush()

    # Auto-create script
    script = PodcastScript(
        project_id=project.id,
        status="draft",
        created_at=now,
        updated_at=now,
    )
    db.add(script)

    # Auto-create default roles
    if body.mode == "duo":
        roles = [
            PodcastRole(
                project_id=project.id,
                role_key="host",
                name="主持人",
                speed=1.0,
                pitch=0.0,
                volume=1.0,
                color="#10b981",
            ),
            PodcastRole(
                project_id=project.id,
                role_key="guest",
                name="嘉宾",
                speed=1.0,
                pitch=0.0,
                volume=1.0,
                color="#3b82f6",
            ),
        ]
    else:
        roles = [
            PodcastRole(
                project_id=project.id,
                role_key="host",
                name="主持人",
                speed=1.0,
                pitch=0.0,
                volume=1.0,
                color="#10b981",
            ),
        ]
    db.add_all(roles)
    db.commit()
    db.refresh(project)
    return {"code": 0, "data": project.to_dict(deep=True), "message": "ok"}


# ---------------------------------------------------------------------------
# Get podcast detail
# ---------------------------------------------------------------------------
@router.get("/{project_id}")
def get_podcast(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    project = (
        db.query(PodcastProject)
        .filter(
            PodcastProject.id == project_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Podcast not found")
    return {"code": 0, "data": project.to_dict(deep=True), "message": "ok"}


# ---------------------------------------------------------------------------
# Update podcast
# ---------------------------------------------------------------------------
@router.put("/{project_id}")
def update_podcast(
    project_id: str,
    body: PodcastUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    project = (
        db.query(PodcastProject)
        .filter(
            PodcastProject.id == project_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Podcast not found")

    from datetime import datetime
    project.updated_at = datetime.utcnow()
    if body.title is not None:
        project.title = body.title
    if body.mode is not None:
        project.mode = body.mode
    if body.style is not None:
        project.style = body.style
    if body.target_duration is not None:
        project.target_duration = body.target_duration
    if body.status is not None:
        project.status = body.status

    db.commit()
    return {"code": 0, "data": project.to_dict(), "message": "ok"}


# ---------------------------------------------------------------------------
# Delete podcast
# ---------------------------------------------------------------------------
@router.delete("/{project_id}")
def delete_podcast(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    project = (
        db.query(PodcastProject)
        .filter(
            PodcastProject.id == project_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Podcast not found")
    db.delete(project)
    db.commit()
    return {"code": 0, "data": None, "message": "deleted"}


# ---------------------------------------------------------------------------
# Update script
# ---------------------------------------------------------------------------
@router.put("/{project_id}/script")
def update_script(
    project_id: str,
    body: ScriptUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    project = (
        db.query(PodcastProject)
        .filter(
            PodcastProject.id == project_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Podcast not found")

    script = project.script
    if not script:
        from datetime import datetime
        now = datetime.utcnow()
        script = PodcastScript(
            project_id=project.id,
            status="draft",
            created_at=now,
            updated_at=now,
        )
        db.add(script)
        db.flush()

    from datetime import datetime
    script.updated_at = datetime.utcnow()
    if body.outline is not None:
        script.outline = body.outline
    if body.script_content is not None:
        script.script_content = body.script_content
        script.status = "edited"

    db.commit()
    return {"code": 0, "data": script.to_dict(), "message": "ok"}
