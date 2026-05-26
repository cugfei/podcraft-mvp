"""Podcast project CRUD routes — real JWT auth."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

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
        query.options(joinedload(PodcastProject.final_audio_asset))
        .order_by(PodcastProject.updated_at.desc())
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

# ---------------------------------------------------------------------------
# Rebuild full audio (concatenate completed segment audio)
# ---------------------------------------------------------------------------
from datetime import datetime, timezone
from pathlib import Path
import wave, os

AUDIO_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def _concatenate_wav_files(input_paths: list, output_path: str):
    """Concatenate multiple WAV files into one."""
    if not input_paths:
        return
    with wave.open(input_paths[0], 'rb') as first:
        params = first.getparams()
        with wave.open(output_path, 'wb') as out:
            out.setparams(params)
            out.writeframes(first.readframes(first.getnframes()))
            for p in input_paths[1:]:
                with wave.open(p, 'rb') as w:
                    out.writeframes(w.readframes(w.getnframes()))


from app.models.segment import PodcastSegment
from app.models.audio_asset import AudioAsset
from fastapi import Query


@router.post("/{project_id}/rebuild-audio")
def rebuild_audio(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Rebuild full podcast audio by concatenating completed segment audio."""
    project = _get_project(project_id, current_user, db)
    script = _get_script(project_id, db)

    segments = (
        db.query(PodcastSegment)
        .filter(
            PodcastSegment.script_id == script.id,
            PodcastSegment.status == "completed",
            PodcastSegment.audio_asset_id.isnot(None),
        )
        .order_by(PodcastSegment.sort_order)
        .all()
    )
    if not segments:
        raise HTTPException(status_code=400, detail="No completed segments with audio")

    wav_paths = []
    total_duration_ms = 0
    for seg in segments:
        if seg.audio_asset and seg.audio_asset.url:
            fname = seg.audio_asset.url.split("/")[-1]
            fpath = AUDIO_DIR / fname
            if fpath.exists():
                wav_paths.append(str(fpath))
                total_duration_ms += seg.audio_asset.duration_ms or 0

    if not wav_paths:
        raise HTTPException(status_code=400, detail="No audio files found")

    output_fname = f"full_{project_id}.wav"
    output_path = str(AUDIO_DIR / output_fname)
    _concatenate_wav_files(wav_paths, output_path)

    file_size = os.path.getsize(output_path)
    now = datetime.now(timezone.utc)

    asset = db.query(AudioAsset).filter(
        AudioAsset.project_id == project_id,
        AudioAsset.type == "full",
    ).first()

    if not asset:
        asset = AudioAsset(
            project_id=project_id,
            type="full",
            format="wav",
            duration_ms=total_duration_ms,
            file_size=file_size,
            url=f"/static/audio/{output_fname}",
            created_at=now,
        )
        db.add(asset)
    else:
        asset.file_size = file_size
        asset.duration_ms = total_duration_ms
        asset.url = f"/static/audio/{output_fname}"
        asset.updated_at = now

    db.commit()
    return {"code": 0, "data": asset.to_dict(), "message": "rebuilt"}


# ---------------------------------------------------------------------------
# Change role voice
# ---------------------------------------------------------------------------
from pydantic import BaseModel


class VoiceChange(BaseModel):
    voice_id: str
    speed: float = 1.0
    pitch: float = 0.0
    volume: float = 1.0


@router.post("/roles/{role_id}/change-voice")
def change_voice(
    role_id: str,
    body: VoiceChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Change a role's voice and mark all its segments as draft."""
    from app.models.podcast import PodcastRole
    role = (
        db.query(PodcastRole)
        .join(PodcastProject)
        .filter(
            PodcastRole.id == role_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    now = datetime.now(timezone.utc)

    role.voice_id = body.voice_id
    role.speed = body.speed
    role.pitch = body.pitch
    role.volume = body.volume
    role.updated_at = now

    # Mark all segments for this role as draft
    script = db.query(PodcastScript).filter(PodcastScript.project_id == role.project_id).first()
    if script:
        segs = db.query(PodcastSegment).filter(
            PodcastSegment.script_id == script.id,
            PodcastSegment.role_id == role.id,
        ).all()
        for seg in segs:
            seg.status = "draft"
            seg.audio_asset_id = None
            seg.updated_at = now

    db.commit()
    return {"code": 0, "data": role.to_dict(), "message": "voice changed, segments marked draft"}
