"""Synthesis task API — query and retry background TTS jobs."""

from typing import Optional

from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.utils.response import success

router = APIRouter(prefix="/synthesis-tasks", tags=["synthesis"])


@router.get("/synthesis-tasks/{task_id}")
def get_synthesis_task(task_id: str):
    """Return the current status of a background synthesis task.

    Response fields: ``id``, ``status``, ``total_segments``, ``completed_segments``,
    ``type``, ``estimated_credits``, ``actual_credits``, ``provider_used``,
    ``error_message``, ``created_at``, ``completed_at``.
    """
    from app.models.synthesis_task import SynthesisTask

    db = next(get_db())
    try:
        task = db.query(SynthesisTask).filter(SynthesisTask.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Synthesis task not found")

        return success({
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
        })
    finally:
        db.close()


@router.get("/synthesis-tasks")
def list_synthesis_tasks(project_id: Optional[str] = None):
    """Return a paginated list of synthesis tasks, optionally filtered by project."""
    from app.models.synthesis_task import SynthesisTask

    db = next(get_db())
    try:
        query = db.query(SynthesisTask)
        if project_id:
            query = query.filter(SynthesisTask.project_id == project_id)
        tasks = query.order_by(SynthesisTask.created_at.desc()).limit(50).all()

        return success({
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
        })
    finally:
        db.close()
