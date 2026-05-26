"""Script generation API – T-4.4 (with segment splitting)."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.podcast import PodcastProject, PodcastScript, PodcastRole
from app.models.segment import PodcastSegment
from app.models.user import User
from app.api.v1.auth import get_current_user
from app.services.llm_service import generate_script, parse_script_to_segments

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/podcasts", tags=["script"])


class ScriptGenerateRequest(BaseModel):
    """Request body for script generation."""

    regenerate: bool = False


class ScriptResponse(BaseModel):
    """Response for script generation."""

    code: int = 0
    data: Optional[dict] = None
    message: str = "ok"


@router.post("/{podcast_id}/script")
async def generate_podcast_script(
    podcast_id: str,
    body: ScriptGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScriptResponse:
    """Generate podcast script using LLM and split into segments.

    Returns:
        Generated script and segment list.
    """
    # Fetch podcast with relationships
    project = (
        db.query(PodcastProject)
        .options(
            joinedload(PodcastProject.script),
            joinedload(PodcastProject.roles),
        )
        .filter(
            PodcastProject.id == podcast_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Podcast not found")

    # Get script record
    script = project.script
    if not script:
        script = PodcastScript(project_id=podcast_id)
        db.add(script)

    # Check if outline exists
    if not script.outline and not body.regenerate:
        raise HTTPException(
            status_code=400,
            detail="No outline found. Please generate outline first.",
        )

    # Get or create roles
    roles = []
    if project.mode == "duo":
        roles = [role.to_dict() for role in project.roles]

    # For solo mode, ensure a default host role exists
    if not roles:
        host_role = (
            db.query(PodcastRole)
            .filter(
                PodcastRole.project_id == podcast_id,
                PodcastRole.role_key == "host",
            )
            .first()
        )
        if not host_role:
            host_role = PodcastRole(
                project_id=podcast_id,
                role_key="host",
                name="主持人",
                color="#1976d2",
            )
            db.add(host_role)
            db.flush()  # Get the ID
        roles = [host_role.to_dict()]

    # Generate script using LLM
    try:
        script_text = generate_script(
            title=project.title,
            outline=script.outline or project.title,
            style=project.style or "professional",
            mode=project.mode or "solo",
            roles=roles if roles else None,
        )
    except Exception as e:
        logger.error("Script generation failed: %s", e)
        raise HTTPException(status_code=500, detail="LLM generation failed")

    # Save script
    script.script_content = script_text
    script.status = "generated"

    # Parse script into segments
    segments_data = parse_script_to_segments(script_text, roles)

    # Clear existing segments if regenerating
    if body.regenerate:
        db.query(PodcastSegment).filter(
            PodcastSegment.script_id == script.id
        ).delete()

    # Create segment records
    created_segments = []
    for idx, seg_data in enumerate(segments_data):
        # Find role by role_key (always look up)
        role_key = seg_data.get("role_key", "host")
        role = (
            db.query(PodcastRole)
            .filter(
                PodcastRole.project_id == podcast_id,
                PodcastRole.role_key == role_key,
            )
            .first()
        )

        segment = PodcastSegment(
            script_id=script.id,
            role_id=role.id if role else None,
            sort_order=idx,
            text=seg_data["text"],
            emotion=seg_data.get("emotion", "neutral"),
            pause_after_ms=seg_data.get("pause_after_ms", 700),
            status="draft",
        )
        db.add(segment)
        created_segments.append(segment)

    # Update project status
    project.status = "ready_to_synthesize"
    db.commit()

    # Refresh to get IDs
    for seg in created_segments:
        db.refresh(seg)

    return ScriptResponse(
        data={
            "script": script_text,
            "podcast_id": podcast_id,
            "status": project.status,
            "segments_count": len(created_segments),
            "segments": [seg.to_dict() for seg in created_segments],
        },
        message=f"Script generated with {len(created_segments)} segments",
    )


@router.get("/{podcast_id}/script")
async def get_podcast_script(
    podcast_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScriptResponse:
    """Get existing podcast script and segments."""
    project = (
        db.query(PodcastProject)
        .options(
            joinedload(PodcastProject.script),
        )
        .filter(
            PodcastProject.id == podcast_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Podcast not found")

    script = project.script
    if not script:
        return ScriptResponse(
            data={
                "script": None,
                "podcast_id": podcast_id,
                "status": project.status,
                "segments": [],
            },
            message="No script found",
        )

    # Get segments
    segments = (
        db.query(PodcastSegment)
        .filter(PodcastSegment.script_id == script.id)
        .order_by(PodcastSegment.sort_order)
        .all()
    )

    return ScriptResponse(
        data={
            "script": script.script_content,
            "podcast_id": podcast_id,
            "status": project.status,
            "segments_count": len(segments),
            "segments": [seg.to_dict() for seg in segments],
        },
        message="ok",
    )
