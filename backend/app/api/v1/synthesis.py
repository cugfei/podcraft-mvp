"""Synthesis task API — create, query and retry background TTS jobs."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.synthesis_task import SynthesisTask
from app.models.user import User
from app.api.v1.auth import get_current_user
from app.services.synthesis_service import create_synthesis_task, list_tasks
from app.utils.response import success

router = APIRouter(prefix="/api/v1", tags=["synthesis"])


class SynthesizeRequest(BaseModel):
    """Request body for starting synthesis."""

    task_type: str = "full"  # full / segment


class SynthesisResponse(BaseModel):
    """Response for synthesis operations."""

    code: int = 0
    data: Optional[dict] = None
    message: str = "ok"


@router.post("/podcasts/{podcast_id}/synthesize")
async def start_synthesis(
    podcast_id: str,
    body: SynthesizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SynthesisResponse:
    """Start TTS synthesis for a podcast project.

    Returns:
        Task ID for tracking progress.
    """
    # Verify project ownership
    from app.models.podcast import PodcastProject

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

    # Check if project is ready
    if project.status not in ["ready_to_synthesize", "completed", "failed"]:
        raise HTTPException(
            status_code=400,
            detail=f"Project not ready for synthesis. Current status: {project.status}",
        )

    # Create and run synthesis task (synchronous for MVP with Mock TTS)
    try:
        task = create_synthesis_task(
            db=db,
            project_id=podcast_id,
            user_id=str(current_user.id),
            task_type=body.task_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")

    # Update project status
    project.status = "completed" if task.status == "completed" else task.status
    db.commit()

    return SynthesisResponse(
        data={
            "task_id": str(task.id),
            "status": task.status,
            "total_segments": task.total_segments,
            "completed_segments": task.completed_segments,
            "project_status": project.status,
        },
        message=f"Synthesis {task.status}",
    )


@router.get("/synthesis-tasks/{task_id}")
async def get_synthesis_task(
    task_id: str,
    db: Session = Depends(get_db),
) -> SynthesisResponse:
    """Return the current status of a background synthesis task."""
    task = db.query(SynthesisTask).filter(SynthesisTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Synthesis task not found")

    return SynthesisResponse(
        data={
            "id": str(task.id),
            "project_id": str(task.project_id),
            "user_id": str(task.user_id),
            "type": task.type,
            "status": task.status,
            "total_segments": task.total_segments,
            "completed_segments": task.completed_segments,
            "estimated_credits": task.estimated_credits,
            "actual_credits": task.actual_credits,
            "retry_count": task.retry_count,
            "provider_used": task.provider_used,
            "error_message": task.error_message,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        },
        message="ok",
    )


@router.get("/synthesis-tasks")
async def list_synthesis_tasks(
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SynthesisResponse:
    """Return a paginated list of synthesis tasks."""
    tasks = list_tasks(
        db=db,
        project_id=project_id,
        user_id=str(current_user.id),
    )

    return SynthesisResponse(
        data={
            "items": [
                {
                    "id": str(t.id),
                    "project_id": str(t.project_id),
                    "type": t.type,
                    "status": t.status,
                    "total_segments": t.total_segments,
                    "completed_segments": t.completed_segments,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in tasks
            ],
            "total": len(tasks),
        },
        message="ok",
    )
