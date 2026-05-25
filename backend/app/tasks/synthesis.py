"""Synthesis tasks — background Celery jobs for TTS generation.

Celery tasks are synchronous; async TTS calls are wrapped with ``asyncio.run()``.
"""

import asyncio
import logging
from typing import List, Optional
from uuid import UUID

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Async → sync bridge
# ---------------------------------------------------------------------------

def _await(coro):
    """Run an async coroutine inside a Celery task (sync context)."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(lambda: asyncio.run(coro)).result()
    except RuntimeError:
        pass
    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Segment synthesis
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=3, name="synthesize_segment")
def synthesize_segment_task(
    self,
    segment_id: str,
    text: str,
    voice_id: str,
    speed: float = 1.0,
    pitch: float = 0.0,
    volume: float = 0.0,
    emotion: Optional[str] = None,
    language: str = "zh-CN",
) -> dict:
    """Synthesise a single segment — retries w/ exponential backoff."""

    async def _call():
        from app.services.tts import tts_registry, TTSRequest, TTSEmotion
        emotion_enum = TTSEmotion(emotion) if emotion else None
        return await tts_registry.synthesize(TTSRequest(
            text=text, voice_id=voice_id, speed=speed,
            pitch=pitch, volume=volume, emotion=emotion_enum, language=language,
        ))

    try:
        response = _await(_call())

        # Persist audio asset and update segment status
        db = _get_db()
        try:
            from app.models.audio_asset import AudioAsset
            from app.models.segment import PodcastSegment

            asset = AudioAsset(
                segment_id=UUID(segment_id),
                type="segment",
                format=response.format,
                duration_ms=response.duration_ms,
                file_size=len(response.audio_data),
            )
            db.add(asset)
            db.flush()

            segment = db.get(PodcastSegment, UUID(segment_id))
            if segment:
                segment.status = "completed"
                segment.audio_asset_id = asset.id
            db.commit()
        finally:
            db.close()

        return {
            "segment_id": segment_id,
            "duration_ms": response.duration_ms,
            "provider": response.provider,
            "request_id": response.request_id,
        }

    except Exception as exc:
        logger.error("Segment %s failed (attempt %d): %s", segment_id, self.request.retries + 1, exc)
        _mark_segment_failed(segment_id, str(exc)[:500])
        raise self.retry(exc=exc)


# ---------------------------------------------------------------------------
# Full-project synthesis
# ---------------------------------------------------------------------------

@celery_app.task(bind=True, max_retries=3, name="synthesize_full")
def synthesize_full_task(
    self,
    task_id: str,
    project_id: str,
    segment_ids: List[str],
) -> dict:
    """Fan-out synthesis across all segments, then update project status."""

    db = _get_db()
    try:
        from app.models.synthesis_task import SynthesisTask
        from app.models.podcast import PodcastProject
        from app.models.segment import PodcastSegment

        task = db.get(SynthesisTask, UUID(task_id))
        if task:
            task.status = "running"
            task.total_segments = len(segment_ids)
            db.commit()
    finally:
        db.close()

    completed = 0
    for seg_id in segment_ids:
        db = _get_db()
        try:
            seg = db.get(PodcastSegment, UUID(seg_id))
        finally:
            db.close()

        if not seg:
            continue

        try:
            result = synthesize_segment_task.delay(
                segment_id=seg_id,
                text=seg.text,
                voice_id=str(seg.role.voice_id) if seg.role and seg.role.voice_id else "xiaoxiao",
                speed=float(seg.role.speed) if seg.role else 1.0,
                pitch=float(seg.role.pitch) if seg.role else 0.0,
                volume=float(seg.role.volume) if seg.role else 0.0,
                emotion=seg.emotion,
            )
            result.get(timeout=300)
            completed += 1
        except Exception as exc:
            logger.error("Segment %s in task %s failed: %s", seg_id, task_id, exc)

        db = _get_db()
        try:
            t = db.get(SynthesisTask, UUID(task_id))
            if t:
                t.completed_segments = completed
                db.commit()
        finally:
            db.close()

    # Final status update
    final_status = "completed" if completed == len(segment_ids) else "failed"
    db = _get_db()
    try:
        t = db.get(SynthesisTask, UUID(task_id))
        if t:
            t.status = final_status
            t.completed_segments = completed
        proj = db.get(PodcastProject, UUID(project_id))
        if proj:
            proj.status = final_status
        db.commit()
    finally:
        db.close()

    return {"task_id": task_id, "status": final_status, "completed_segments": completed}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_db():
    from app.database import SessionLocal
    return SessionLocal()


def _mark_segment_failed(segment_id: str, error: str) -> None:
    db = _get_db()
    try:
        from app.models.segment import PodcastSegment
        seg = db.get(PodcastSegment, UUID(segment_id))
        if seg:
            seg.status = "failed"
            seg.error_message = error
            db.commit()
    except Exception:
        pass
    finally:
        db.close()
