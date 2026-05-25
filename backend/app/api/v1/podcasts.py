"""Podcast project CRUD routes."""

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
@router.get("/list")  # 使用 /list 避免与 /{project_id} 冲突
def list_podcasts(
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    query = db.query(PodcastProject).filter(PodcastProject.user_id == user.id)
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
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    from datetime import datetime
    now = datetime.utcnow()

    project = PodcastProject(
        user_id=user.id,
        title=body.title,
        mode=body.mode,
        style=body.style,
        target_duration=body.target_duration,
        status="draft",
        created_at=now,
        updated_at=now,
    )
    db.add(project)
    db.flush()  # get project.id

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
                created_at=now,
                updated_at=now,
            ),
            PodcastRole(
                project_id=project.id,
                role_key="guest",
                name="嘉宾",
                speed=1.0,
                pitch=0.0,
                volume=1.0,
                color="#3b82f6",
                created_at=now,
                updated_at=now,
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
                created_at=now,
                updated_at=now,
            ),
        ]
    db.add_all(roles)
    db.commit()
    db.refresh(project)
    return {"code": 0, "data": project.to_dict(), "message": "ok"}

# ---------------------------------------------------------------------------
# Get podcast detail
# ---------------------------------------------------------------------------
@router.get("/{project_id}")
def get_podcast(
    project_id: str,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    project = (
        db.query(PodcastProject)
        .filter(PodcastProject.id == project_id, PodcastProject.user_id == user.id)
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
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    project = (
        db.query(PodcastProject)
        .filter(PodcastProject.id == project_id, PodcastProject.user_id == user.id)
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
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    project = (
        db.query(PodcastProject)
        .filter(PodcastProject.id == project_id, PodcastProject.user_id == user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Podcast not found")
    db.delete(project)
    db.commit()
    return {"code": 0, "data": None, "message": "deleted"}


# ---------------------------------------------------------------------------
# Update script content
# ---------------------------------------------------------------------------
@router.put("/{project_id}/script")
def update_script(
    project_id: str,
    body: ScriptUpdate,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    project = (
        db.query(PodcastProject)
        .filter(PodcastProject.id == project_id, PodcastProject.user_id == user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Podcast not found")

    script = project.script
    if not script:
        from datetime import datetime
        script = PodcastScript(
            project_id=project.id,
            status="draft",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
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


# ---------------------------------------------------------------------------
# Helper: to_dict for models
# ---------------------------------------------------------------------------
def _add_to_dict_methods():
    """Monkey-patch to_dict for podcast models if not present."""
    from app.models.podcast import PodcastProject as PP, PodcastScript as PS, PodcastRole as PR
    from app.models.segment import PodcastSegment as PSeg
    from app.models.audio_asset import AudioAsset

    if hasattr(PP, "to_dict"):
        return

    def _audio_to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "duration_seconds": self.duration_seconds,
        }

    AudioAsset.to_dict = _audio_to_dict

    def _seg_to_dict(self, deep=False):
        d: Dict[str, Any] = {
            "id": self.id,
            "script_id": self.script_id,
            "role_id": self.role_id,
            "sort_order": self.sort_order,
            "text": self.text,
            "emotion": self.emotion,
            "pause_after_ms": self.pause_after_ms,
            "status": self.status,
            "error_message": self.error_message,
        }
        if deep and self.role:
            d["role"] = {"id": self.role.id, "name": self.role.name, "color": self.role.color}
        if deep and self.audio_asset:
            d["audio_asset"] = self.audio_asset.to_dict()
        return d

    PSeg.to_dict = _seg_to_dict

    def _role_to_dict(self, deep=False):
        d: Dict[str, Any] = {
            "id": self.id,
            "role_key": self.role_key,
            "name": self.name,
            "persona": self.persona,
            "voice_id": self.voice_id,
            "speed": float(self.speed) if self.speed else 1.0,
            "pitch": float(self.pitch) if self.pitch else 0.0,
            "volume": float(self.volume) if self.volume else 1.0,
            "color": self.color,
        }
        if deep and self.voice_preset:
            d["voice_preset"] = {"id": self.voice_preset.id, "name": self.voice_preset.name}
        return d

    PR.to_dict = _role_to_dict

    def _script_to_dict(self, deep=False):
        d: Dict[str, Any] = {
            "id": self.id,
            "project_id": self.project_id,
            "outline": self.outline,
            "script_content": self.script_content,
            "status": self.status,
        }
        if deep and self.segments:
            d["segments"] = [s.to_dict(deep=True) for s in self.segments]
        return d

    PS.to_dict = _script_to_dict

    def _pp_to_dict(self, deep=False):
        d: Dict[str, Any] = {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "mode": self.mode,
            "style": self.style,
            "target_duration": self.target_duration,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if deep:
            d["script"] = self.script.to_dict(deep=True) if self.script else None
            d["roles"] = [r.to_dict(deep=True) for r in self.roles]
            if self.final_audio_asset:
                d["final_audio_asset"] = self.final_audio_asset.to_dict()
        return d

    PP.to_dict = _pp_to_dict


_add_to_dict_methods()
