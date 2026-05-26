"""Outline generation API – T-4.3."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.podcast import PodcastProject, PodcastScript
from app.models.user import User
from app.api.v1.auth import get_current_user
from app.services.llm_service import generate_outline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/podcasts", tags=["outline"])


class OutlineGenerateRequest(BaseModel):
    """Request body for outline generation."""

    prompt: Optional[str] = None


class OutlineResponse(BaseModel):
    """Response for outline generation."""

    code: int = 0
    data: Optional[dict] = None
    message: str = "ok"


@router.post("/{podcast_id}/outline")
async def generate_podcast_outline(
    podcast_id: str,
    body: OutlineGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OutlineResponse:
    """Generate podcast outline using LLM.

    Returns:
        Generated outline in markdown format.
    """
    # Fetch podcast
    project = (
        db.query(PodcastProject)
        .filter(
            PodcastProject.id == podcast_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Podcast not found")

    # Get or create script record
    script = (
        db.query(PodcastScript)
        .filter(PodcastScript.project_id == podcast_id)
        .first()
    )
    if not script:
        script = PodcastScript(project_id=podcast_id)
        db.add(script)

    # Generate outline using LLM
    try:
        outline_text = generate_outline(
            title=project.title,
            style=project.style or "professional",
            target_duration=project.target_duration,
            mode=project.mode or "solo",
            prompt=body.prompt,
        )
    except Exception as e:
        logger.error("Outline generation failed: %s", e)
        raise HTTPException(status_code=500, detail="LLM generation failed")

    # Save outline
    script.outline = outline_text
    script.status = "generated"
    project.status = "scripting"
    db.commit()

    return OutlineResponse(
        data={
            "outline": outline_text,
            "podcast_id": podcast_id,
            "status": project.status,
        },
        message="Outline generated successfully",
    )


@router.get("/{podcast_id}/outline")
async def get_podcast_outline(
    podcast_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OutlineResponse:
    """Get existing podcast outline."""
    project = (
        db.query(PodcastProject)
        .filter(
            PodcastProject.id == podcast_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Podcast not found")

    script = (
        db.query(PodcastScript)
        .filter(PodcastScript.project_id == podcast_id)
        .first()
    )

    return OutlineResponse(
        data={
            "outline": script.outline if script else None,
            "podcast_id": podcast_id,
            "status": project.status,
        },
        message="ok",
    )
