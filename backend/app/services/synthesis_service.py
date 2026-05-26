"""Synthesis service – create and track TTS synthesis tasks (Mock TTS for MVP)."""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.synthesis_task import SynthesisTask
from app.models.audio_asset import AudioAsset
from app.models.podcast import PodcastProject, PodcastScript, PodcastSegment
from app.models.user import User
from app.utils.mock_tts import mock_synthesize

logger = logging.getLogger(__name__)


def create_synthesis_task(
    db: Session,
    project_id: str,
    user_id: str,
    task_type: str = "full",
) -> SynthesisTask:
    """Create a new synthesis task and start processing.

    Args:
        db: Database session.
        project_id: Podcast project ID.
        user_id: Current user ID.
        task_type: "full" (entire script) or "segment" (single segment).

    Returns:
        Created SynthesisTask instance.
    """
    # Fetch project with script and segments
    project = (
        db.query(PodcastProject)
        .filter(PodcastProject.id == project_id)
        .first()
    )
    if not project:
        raise ValueError("Podcast project not found")

    script = (
        db.query(PodcastScript)
        .filter(PodcastScript.project_id == project_id)
        .first()
    )
    if not script:
        raise ValueError("No script found for this project")

    # Get segments to synthesize
    segments = (
        db.query(PodcastSegment)
        .filter(PodcastSegment.script_id == script.id)
        .order_by(PodcastSegment.sort_order)
        .all()
    )
    if not segments:
        raise ValueError("No segments found. Please generate script first.")

    # Count segments that need synthesis
    total_segments = len(segments)
    completed_segments = 0

    # Create task record
    task = SynthesisTask(
        project_id=project_id,
        user_id=user_id,
        type=task_type,
        status="processing",
        total_segments=total_segments,
        completed_segments=0,
        estimated_credits=total_segments,  # 1 credit per segment
        retry_count=0,
        provider_used="mock",
    )
    db.add(task)
    db.flush()  # Get task ID

    logger.info(
        "Created synthesis task %s for project %s (%d segments)",
        task.id,
        project_id,
        total_segments,
    )

    # Process segments (Mock TTS - synchronous for MVP)
    try:
        for idx, segment in enumerate(segments):
            try:
                # Skip already completed segments
                if segment.status == "completed" and segment.audio_asset_id:
                    completed_segments += 1
                    continue

                # Get voice settings from role
                role = segment.role
                voice_id = role.voice_id if role else "zh-CN-XiaoxiaoNeural"
                speed = float(role.speed) if role and role.speed else 1.0
                pitch = int(role.pitch) if role and role.pitch else 0
                emotion = segment.emotion or "neutral"

                # Call Mock TTS
                audio_asset = mock_synthesize(
                    db=db,
                    project_id=project_id,
                    segment_id=segment.id,
                    text=segment.text,
                    voice_id=voice_id,
                    speed=speed,
                    pitch=pitch,
                    volume=1.0,
                    emotion=emotion,
                )

                # Update segment
                segment.audio_asset_id = audio_asset.id
                segment.status = "completed"
                segment.char_count = len(segment.text)

                completed_segments += 1

                # Update task progress
                task.completed_segments = completed_segments
                db.commit()

                logger.info(
                    "Synthesized segment %s (%d/%d)",
                    segment.id,
                    completed_segments,
                    total_segments,
                )

            except Exception as e:
                logger.error("Failed to synthesize segment %s: %s", segment.id, e)
                segment.status = "failed"
                segment.error_message = str(e)
                db.commit()
                # Continue with next segment (don't fail entire task)

        # Check if all segments completed
        failed_segments = sum(1 for s in segments if s.status == "failed")
        if failed_segments > 0 and completed_segments == 0:
            task.status = "failed"
            task.error_message = f"All {failed_segments} segments failed"
        elif failed_segments > 0:
            task.status = "completed_with_errors"
            task.error_message = f"{failed_segments} segments failed"
        else:
            task.status = "completed"

        task.actual_credits = completed_segments
        task.completed_at = datetime.utcnow()
        db.commit()

        logger.info(
            "Synthesis task %s completed: %d/%d segments",
            task.id,
            completed_segments,
            total_segments,
        )

    except Exception as e:
        logger.error("Synthesis task %s failed: %s", task.id, e)
        task.status = "failed"
        task.error_message = str(e)
        task.completed_at = datetime.utcnow()
        db.commit()
        raise

    return task


def get_task_status(db: Session, task_id: str) -> Optional[SynthesisTask]:
    """Get synthesis task by ID."""
    return db.query(SynthesisTask).filter(SynthesisTask.id == task_id).first()


def list_tasks(
    db: Session,
    project_id: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 50,
) -> list[SynthesisTask]:
    """List synthesis tasks with optional filters."""
    query = db.query(SynthesisTask)
    if project_id:
        query = query.filter(SynthesisTask.project_id == project_id)
    if user_id:
        query = query.filter(SynthesisTask.user_id == user_id)
    return query.order_by(SynthesisTask.created_at.desc()).limit(limit).all()
