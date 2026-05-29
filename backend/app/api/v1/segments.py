"""Podcast segment CRUD + reorder + synthesis routes — real JWT auth."""

from typing import List, Optional
import os
import threading
import wave
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pathlib import Path
from sqlalchemy.orm import Session

from app.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.podcast import PodcastProject, PodcastScript, PodcastRole
from app.models.segment import PodcastSegment

router = APIRouter(prefix="/segments", tags=["segments"])
security = HTTPBearer(auto_error=False)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
AUDIO_DIR = Path(__file__).resolve().parent.parent.parent.parent / "static" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_current_active_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_session),
) -> User:
    user = get_current_user(creds, db)
    return user


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
        now = datetime.utcnow()
        script = PodcastScript(
            project_id=project_id,
            status="draft",
            created_at=now,
            updated_at=now,
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
        from datetime import datetime
        now = datetime.utcnow()
        role = PodcastRole(
            project_id=project_id,
            role_key=role_key,
            name="主持人" if role_key == "host" else "嘉宾" if role_key == "guest" else role_key,
            speed=1.0,
            pitch=0,
            volume=1.0,
            color="#10b981" if role_key == "host" else "#3b82f6",
            created_at=now,
            updated_at=now,
        )
        db.add(role)
        db.flush()
    return role


# ---------------------------------------------------------------------------
# Mock synthesis helpers
# ---------------------------------------------------------------------------

def _generate_silence_wav(filepath: str, duration_s: int):
    """Generate a valid WAV file with silence."""
    sample_rate = 22050
    num_samples = sample_rate * duration_s
    with wave.open(filepath, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)   # 16-bit
        wav.setframerate(sample_rate)
        wav.writeframes(b"\x00\x00" * num_samples)


def _mock_synthesize(segment_id: str):
    """Background thread: real TTS (MiMo) → generate WAV → update DB."""
    from app.database import SessionLocal
    from app.models.segment import PodcastSegment
    from app.models.audio_asset import AudioAsset
    from app.models.provider_config import load_provider_config
    from app.services.mimo_tts_provider import MiMoTTSProvider
    from datetime import datetime, timezone

    db = SessionLocal()
    try:
        seg = db.query(PodcastSegment).filter(PodcastSegment.id == segment_id).first()
        if not seg:
            return

        # Mark synthesizing
        seg.status = "synthesizing"
        seg.updated_at = datetime.now(timezone.utc)
        db.commit()

        # Get voice settings from role
        voice_id = "mimo_default"
        if seg.role and seg.role.voice_id:
            voice_id = seg.role.voice_id

        # Try real TTS via provider chain (primary → fallback → mock)
        audio_data = None
        duration_ms = 0
        provider_name = "mock"

        # Load provider config
        provider_config = load_provider_config(db)
        primary = provider_config.get("primary", "mimo")

        providers_to_try = [primary]
        fallback_p = provider_config.get("fallback", "")
        if fallback_p and fallback_p != primary:
            providers_to_try.append(fallback_p)
        if "mimo" not in providers_to_try:
            providers_to_try.append("mimo")

        for provider_key in providers_to_try:
            try:
                if provider_key == "minimax":
                    minimax_key = provider_config.get("minimax_api_key", "") or ""
                    minimax_base = provider_config.get("minimax_api_base", "") or "https://api.minimaxi.com"
                    if not minimax_key:
                        continue
                    from app.services.minimax_tts_provider import MiniMaxTTSProvider
                    client = MiniMaxTTSProvider(api_key=minimax_key, api_base=minimax_base)
                    result = client.synthesize(text=seg.text or "", voice_id=voice_id)
                    audio_data = result["audio_data"]
                    duration_ms = result["duration_ms"]
                    provider_name = "minimax"
                    break

                elif provider_key == "mimo":
                    mimo_api_key = provider_config.get("mimo_api_key", "") or ""
                    mimo_api_base = provider_config.get("mimo_api_base", "")
                    if not mimo_api_key:
                        continue
                    mimo = MiMoTTSProvider(api_key=mimo_api_key)
                    if mimo_api_base:
                        mimo.base_url = mimo_api_base
                    result = mimo.synthesize(text=seg.text or "", voice_id=voice_id)
                    audio_data = result["audio_data"]
                    duration_ms = result["duration_ms"]
                    provider_name = "mimo"
                    break

                elif provider_key == "edge-tts":
                    edge_enabled = provider_config.get("edge_tts_enabled", "true").lower() == "true"
                    if not edge_enabled:
                        continue
                    try:
                        import asyncio as _asyncio
                        from app.services.tts.edge_tts import EdgeTTSProvider
                        from app.services.tts.models import TTSRequest as _TTSReq
                        async def _edge_synth():
                            edge = EdgeTTSProvider(EdgeTTSProvider._default_config())
                            req = _TTSReq(text=seg.text or "", voice_id=voice_id)
                            return await edge.synthesize(req)
                        result = _asyncio.run(_edge_synth())
                        audio_data = result.audio_data
                        duration_ms = result.duration_ms
                        provider_name = "edge-tts"
                        break
                    except Exception as e:
                        import logging
                        logging.getLogger(__name__).warning("Edge-TTS failed in thread: %s", e)
                        continue

            except Exception as e:
                import logging
                logging.getLogger(__name__).warning("Provider %s failed: %s", provider_key, e)
                continue

        if audio_data is None:
            # Mock fallback: generate silence
            duration_s = max(1, len(seg.text or "") // 10)
            duration_ms = duration_s * 1000
            import io, wave, struct
            sample_rate = 22050
            num_samples = sample_rate * duration_s
            wav_buffer = io.BytesIO()
            with wave.open(wav_buffer, "wb") as wav:
                wav.setnchannels(1)
                wav.setsampwidth(2)
                wav.setframerate(sample_rate)
                wav.writeframes(b"\x00\x00" * num_samples)
            audio_data = wav_buffer.getvalue()

        # Save audio to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{provider_name}_{segment_id}_{timestamp}.wav"
        filepath = AUDIO_DIR / filename
        with open(filepath, "wb") as f:
            f.write(audio_data)

        file_size = filepath.stat().st_size
        now = datetime.now(timezone.utc)

        # Create or update AudioAsset
        asset = None
        if seg.audio_asset_id:
            asset = db.query(AudioAsset).filter(AudioAsset.id == seg.audio_asset_id).first()
        if not asset:
            asset = AudioAsset(
                project_id=seg.script.project_id if seg.script else None,
                segment_id=seg.id,
                type="segment",
                format="wav",
                duration_ms=duration_ms,
                file_size=file_size,
                url=f"/static/audio/{filename}",
                created_at=now,
            )
            db.add(asset)
            db.flush()
            seg.audio_asset_id = asset.id
        else:
            asset.url = f"/static/audio/{filename}"
            asset.file_size = file_size
            asset.duration_ms = duration_ms
            asset.updated_at = now

        seg.status = "completed"
        seg.updated_at = now
        db.commit()

        # Deduct frozen credits
        try:
            from app.services.credit_service import deduct
            proj = db.query(PodcastProject).join(PodcastScript).filter(
                PodcastScript.id == seg.script_id
            ).first()
            if proj:
                char_count = len(seg.text or "")
                cost = max(20, char_count + 20)
                deduct(db, proj.user_id, cost, f"segment:{segment_id}")
        except Exception:
            pass

        # Update project status if all segments completed
        try:
            from app.models.podcast import PodcastProject, PodcastScript
            script = db.query(PodcastScript).filter(PodcastScript.id == seg.script_id).first()
            if script:
                total = db.query(PodcastSegment).filter(
                    PodcastSegment.script_id == script.id
                ).count()
                done = db.query(PodcastSegment).filter(
                    PodcastSegment.script_id == script.id,
                    PodcastSegment.status == "completed",
                ).count()
                if total > 0 and total == done:
                    project = db.query(PodcastProject).filter(
                        PodcastProject.id == script.project_id
                    ).first()
                    if project and project.status == "draft":
                        project.status = "completed"
                        project.final_audio_asset_id = asset.id
                        project.updated_at = now
                        db.commit()
        except Exception:
            db.rollback()
    except Exception as e:
        db.rollback()
        try:
            seg = db.query(PodcastSegment).filter(PodcastSegment.id == segment_id).first()
            if seg:
                seg.status = "failed"
                seg.error_message = str(e)[:500]
                seg.updated_at = datetime.now(timezone.utc)
                db.commit()
                # Refund frozen credits on failure
                from app.services.credit_service import refund
                try:
                    seg2 = db.query(PodcastSegment).filter(PodcastSegment.id == segment_id).first()
                    if seg2:
                        proj = seg2.script.project if seg2.script else None
                        if proj:
                            cost = max(20, len(seg2.text or "") + 20)
                            refund(db, proj.user_id, cost, f"segment:{segment_id}")
                except Exception:
                    pass
        except Exception:
            db.rollback()
    finally:
        db.close()


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
# List segments
# ---------------------------------------------------------------------------
@router.get("/podcasts/{project_id}/segments")
def list_segments(
    project_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    project = _get_project(project_id, current_user, db)
    script = _get_script(project_id, db)
    segments = (
        db.query(PodcastSegment)
        .filter(PodcastSegment.script_id == script.id)
        .order_by(PodcastSegment.sort_order)
        .all()
    )
    return {
        "code": 0,
        "data": [s.to_dict() for s in segments],
        "message": "ok",
    }


# ---------------------------------------------------------------------------
# Create segment
# ---------------------------------------------------------------------------
@router.post("/podcasts/{project_id}/segments")
def create_segment(
    project_id: str,
    body: SegmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    project = _get_project(project_id, current_user, db)
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
@router.get("/segments/{segment_id}")
def get_segment(
    segment_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    """Get a single segment by ID."""
    seg = (
        db.query(PodcastSegment)
        .join(PodcastScript)
        .join(PodcastProject)
        .filter(
            PodcastSegment.id == segment_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    return {"code": 0, "data": seg.to_dict(), "message": "ok"}


# ---------------------------------------------------------------------------
@router.put("/segments/{segment_id}")
def update_segment(
    segment_id: str,
    body: SegmentUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    seg = (
        db.query(PodcastSegment)
        .join(PodcastScript)
        .join(PodcastProject)
        .filter(
            PodcastSegment.id == segment_id,
            PodcastProject.user_id == current_user.id,
        )
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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    seg = (
        db.query(PodcastSegment)
        .join(PodcastScript)
        .join(PodcastProject)
        .filter(
            PodcastSegment.id == segment_id,
            PodcastProject.user_id == current_user.id,
        )
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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    project = _get_project(project_id, current_user, db)
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
# Trigger TTS synthesis for a single segment
# ---------------------------------------------------------------------------
@router.post("/segments/{segment_id}/synthesize")
def synthesize_segment(
    segment_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_session),
):
    """Queue a single segment for TTS synthesis."""
    seg = (
        db.query(PodcastSegment)
        .join(PodcastScript)
        .join(PodcastProject)
        .filter(
            PodcastSegment.id == segment_id,
            PodcastProject.user_id == current_user.id,
        )
        .first()
    )
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")

    # Check if already completed recently
    if seg.status == "completed" and seg.audio_asset_id:
        return {"code": 0, "data": {"status": "completed", "already_done": True}, "message": "already completed"}

    # Mark as queued
    from datetime import datetime, timezone
    seg.status = "queued"
    seg.error_message = None
    seg.updated_at = datetime.now(timezone.utc)
    db.commit()

    # Freeze credits (cost = char_count + 20, minimum 20)
    from app.services.credit_service import freeze
    char_count = len(seg.text or "")
    cost = max(20, char_count + 20)
    if not freeze(db, current_user.id, cost, f"segment:{segment_id}"):
        seg.status = "draft"
        db.commit()
        raise HTTPException(status_code=402, detail=f"积分不足，需要 {cost} 积分")

    # Launch background thread (MVP mock; Phase 4 will use Celery)
    t = threading.Thread(target=_mock_synthesize, args=(segment_id,), daemon=True)
    t.start()

    return {"code": 0, "data": {"status": "queued"}, "message": "synthesis queued"}


# ---------------------------------------------------------------------------
# SSE Streaming Batch Synthesis
# ---------------------------------------------------------------------------
import json
from fastapi.responses import StreamingResponse


class BatchSynthesizeRequest(BaseModel):
    segment_ids: List[str]


def _synthesize_single_segment(segment_id: str, db: Session) -> dict:
    """
    Synthesize a single segment synchronously within the given DB session.
    Returns: {"success": bool, "audio_url": str|None, "duration_ms": int, "error": str|None, "provider": str}
    """
    from app.models.audio_asset import AudioAsset
    from app.models.provider_config import load_provider_config
    from app.services.mimo_tts_provider import MiMoTTSProvider
    from app.services.minimax_tts_provider import MiniMaxTTSProvider

    seg = db.query(PodcastSegment).filter(PodcastSegment.id == segment_id).first()
    if not seg:
        return {"success": False, "audio_url": None, "duration_ms": 0, "error": "Segment not found", "provider": "none"}

    # Mark synthesizing
    seg.status = "synthesizing"
    seg.updated_at = datetime.now(timezone.utc)
    db.commit()

    # Get voice settings from role
    voice_id = "mimo_default"
    if seg.role and seg.role.voice_id:
        voice_id = seg.role.voice_id

    # Load provider config
    provider_config = load_provider_config(db)
    primary = provider_config.get("primary", "mimo")

    # Try primary provider, then fallback
    audio_data = None
    duration_ms = 0
    provider_name = "mock"

    # ── Provider try chain ──
    providers_to_try = [primary]
    fallback = provider_config.get("fallback", "")
    if fallback and fallback != primary:
        providers_to_try.append(fallback)
    # Always keep mimo as last resort (unless already tried)
    if "mimo" not in providers_to_try:
        providers_to_try.append("mimo")

    import logging
    log = logging.getLogger(__name__)

    for provider_key in providers_to_try:
        try:
            if provider_key == "minimax":
                minimax_key = provider_config.get("minimax_api_key", "") or ""
                minimax_base = provider_config.get("minimax_api_base", "") or "https://api.minimaxi.com"
                if not minimax_key:
                    log.info("MiniMax API key not configured, skipping")
                    continue
                client = MiniMaxTTSProvider(api_key=minimax_key, api_base=minimax_base)
                result = client.synthesize(
                    text=seg.text or "",
                    voice_id=voice_id,
                )
                audio_data = result["audio_data"]
                duration_ms = result["duration_ms"]
                provider_name = "minimax"
                break

            elif provider_key == "mimo":
                mimo_key = provider_config.get("mimo_api_key", "") or ""
                mimo_base = provider_config.get("mimo_api_base", "")
                if not mimo_key:
                    log.info("MiMo API key not configured, skipping")
                    continue
                client = MiMoTTSProvider(api_key=mimo_key)
                if mimo_base:
                    client.base_url = mimo_base
                result = client.synthesize(
                    text=seg.text or "",
                    voice_id=voice_id,
                )
                audio_data = result["audio_data"]
                duration_ms = result["duration_ms"]
                provider_name = "mimo"
                break

            elif provider_key == "edge-tts":
                edge_enabled = provider_config.get("edge_tts_enabled", "true").lower() == "true"
                if not edge_enabled:
                    log.info("Edge-TTS disabled, skipping")
                    continue
                try:
                    import asyncio
                    from app.services.tts.edge_tts import EdgeTTSProvider
                    from app.services.tts.models import TTSRequest
                    async def _edge_synth():
                        edge = EdgeTTSProvider(EdgeTTSProvider._default_config())
                        req = TTSRequest(
                            text=seg.text or "",
                            voice_id=voice_id,
                        )
                        return await edge.synthesize(req)
                    result = asyncio.run(_edge_synth())
                    audio_data = result.audio_data
                    duration_ms = result.duration_ms
                    provider_name = "edge-tts"
                    break
                except Exception as e:
                    log.warning("Edge-TTS failed: %s", e)
                    continue

        except Exception as exc:
            log.warning("Provider %s failed for segment %s: %s", provider_key, segment_id, exc)
            continue

    if audio_data is None:
        # Mock fallback: generate silence WAV
        import io
        duration_s = max(1, len(seg.text or "") // 10)
        duration_ms = duration_s * 1000
        sample_rate = 22050
        num_samples = sample_rate * duration_s
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(sample_rate)
            wav.writeframes(b"\x00\x00" * num_samples)
        audio_data = wav_buffer.getvalue()

    # Save audio to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{provider_name}_{segment_id}_{timestamp}.wav"
    filepath = AUDIO_DIR / filename
    with open(filepath, "wb") as f:
        f.write(audio_data)

    file_size = filepath.stat().st_size
    now = datetime.now(timezone.utc)

    # Create or update AudioAsset
    asset = None
    if seg.audio_asset_id:
        asset = db.query(AudioAsset).filter(AudioAsset.id == seg.audio_asset_id).first()
    if not asset:
        asset = AudioAsset(
            project_id=seg.script.project_id if seg.script else None,
            segment_id=seg.id,
            type="segment",
            format="wav",
            duration_ms=duration_ms,
            file_size=file_size,
            url=f"/static/audio/{filename}",
            created_at=now,
        )
        db.add(asset)
        db.flush()
        seg.audio_asset_id = asset.id
    else:
        asset.url = f"/static/audio/{filename}"
        asset.file_size = file_size
        asset.duration_ms = duration_ms
        asset.updated_at = now

    seg.status = "completed"
    seg.updated_at = now
    db.commit()

    return {
        "success": True,
        "audio_url": f"/static/audio/{filename}",
        "duration_ms": duration_ms,
        "error": None,
        "provider": provider_name,
    }


def _merge_audio_for_project(project_id: str, db: Session) -> Optional[str]:
    """Merge all completed segment audio files into a single WAV. Returns file URL or None."""
    from app.models.audio_asset import AudioAsset

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
        return None

    wav_paths: list = []
    seen_paths: set = set()
    total_duration_ms = 0
    for seg in segments:
        if seg.audio_asset and seg.audio_asset.url:
            fname = seg.audio_asset.url.split("/")[-1]
            fpath = AUDIO_DIR / fname
            if fpath.exists() and str(fpath) not in seen_paths:
                wav_paths.append(str(fpath))
                seen_paths.add(str(fpath))
                total_duration_ms += seg.audio_asset.duration_ms or 0

    if not wav_paths:
        return None

    output_fname = f"full_{project_id}_sse.wav"
    output_path = str(AUDIO_DIR / output_fname)

    # Use FFmpeg post-processing pipeline (falls back to wave concat)
    from app.services.audio.processor import post_process_audio
    from app.services.bgm_generator import ensure_bgm_files

    bgm_files = ensure_bgm_files()
    post_process_audio(
        wav_paths, output_path,
        crossfade_ms=50, normalize=True,
        bgm_intro=bgm_files.get("bgm01"),
        bgm_outro=bgm_files.get("bgm02"),
    )

    file_size = os.path.getsize(output_path)
    now = datetime.now(timezone.utc)

    # Create or update full AudioAsset
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

    # Update project status
    project = db.query(PodcastProject).filter(PodcastProject.id == project_id).first()
    if project and project.status in ("draft",):
        project.status = "completed"
        project.final_audio_asset_id = asset.id
        project.updated_at = now

    db.commit()
    return f"/static/audio/{output_fname}"


def _sse_format(data: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


def _synthesize_batch_generator(project_id: str, segment_ids: List[str], user_id: str):
    """
    Synchronous generator yielding SSE-formatted strings.
    Groups consecutive same-voice segments into batches,
    merges text with pause markers, and calls TTS once per batch.
    """
    db = get_session()
    try:
        # ── Validate project ownership ──
        project = (
            db.query(PodcastProject)
            .filter(PodcastProject.id == project_id, PodcastProject.user_id == user_id)
            .first()
        )
        if not project:
            yield _sse_format({"type": "error", "message": "Podcast not found"})
            return

        # ── Validate all segments belong to project ──
        script = _get_script(project_id, db)
        valid_segments: list = []
        invalid_ids: list = []
        for sid in segment_ids:
            seg = db.query(PodcastSegment).filter(
                PodcastSegment.id == sid,
                PodcastSegment.script_id == script.id,
            ).first()
            if seg:
                valid_segments.append(seg)
            else:
                invalid_ids.append(sid)

        if invalid_ids:
            yield _sse_format({"type": "error", "message": f"Invalid segment IDs: {invalid_ids}"})
            return

        # ── Filter to pending segments only ──
        pending = [s for s in valid_segments if s.status != "completed"]
        if not pending:
            yield _sse_format({
                "type": "complete",
                "full_audio_url": None,
                "total_completed": len(valid_segments),
                "total_failed": 0,
                "message": "All segments already completed",
            })
            return

        # ── Freeze credits for all pending segments ──
        from app.services.credit_service import freeze
        segment_costs: dict = {}
        for seg in pending:
            cost = max(20, len(seg.text or "") + 20)
            segment_costs[seg.id] = cost
            if not freeze(db, user_id, cost, f"segment:{seg.id}"):
                from app.services.credit_service import refund
                for rolled_back_id, rolled_back_cost in segment_costs.items():
                    if rolled_back_id != seg.id:
                        try:
                            refund(db, user_id, rolled_back_cost, f"segment:{rolled_back_id}")
                        except Exception:
                            pass
                yield _sse_format({"type": "error", "message": f"积分不足，需要至少 {cost} 积分"})
                return

        # ── Group segments into voice-homogeneous batches ──
        batches = _group_by_voice(pending)
        total = len(pending)
        batch_count = len(batches)

        yield _sse_format({
            "type": "progress",
            "step": "starting",
            "message": f"开始合成 {total} 个片段 ({batch_count} 个批次)",
            "total": total,
            "current": 0,
            "batches": batch_count,
        })

        completed_count = 0
        failed_count = 0
        segment_index = 0  # running index for progress tracking

        for batch_idx, batch in enumerate(batches):
            segs = batch["segments"]
            voice_id = batch["voice_id"]
            batch_seg_ids = [s.id for s in segs]
            preview = (segs[0].text or "")[:30].replace("\n", " ")

            yield _sse_format({
                "type": "progress",
                "step": "synthesizing",
                "message": f"批次 {batch_idx+1}/{batch_count}: {len(segs)} 段 \"{preview}...\"",
                "total": total,
                "current": segment_index,
                "segment_ids": batch_seg_ids,
                "batch_index": batch_idx,
                "batches": batch_count,
            })

            try:
                # Synthesize the entire batch in one TTS call
                result = _synthesize_batch_segments(segs, voice_id, db)
            except Exception as exc:
                import logging
                logging.getLogger(__name__).error("Batch %d synthesis crashed: %s", batch_idx, exc)
                # Refund all segments in this failed batch
                from app.services.credit_service import refund
                for seg in segs:
                    cost = segment_costs.get(seg.id, 0)
                    try:
                        refund(db, user_id, cost, f"segment:{seg.id}")
                    except Exception:
                        pass
                failed_count += len(segs)
                for seg in segs:
                    yield _sse_format({
                        "type": "segment_failed",
                        "segment_id": seg.id,
                        "error": str(exc)[:500],
                        "index": segment_index,
                        "total": total,
                        "completed": completed_count,
                        "failed": failed_count,
                    })
                    segment_index += 1
                continue

            if result["success"]:
                # Deduct credits for all segments in batch
                from app.services.credit_service import deduct
                for seg in segs:
                    cost = segment_costs.get(seg.id, 0)
                    try:
                        deduct(db, user_id, cost, f"segment:{seg.id}")
                    except Exception:
                        pass

                completed_count += len(segs)

                # Emit batch_complete with shared audio URL
                yield _sse_format({
                    "type": "batch_complete",
                    "segment_ids": batch_seg_ids,
                    "audio_url": result["audio_url"],
                    "duration_ms": result["duration_ms"],
                    "provider": result.get("provider", "mock"),
                    "batch_index": batch_idx,
                    "batches": batch_count,
                    "seg_count": len(segs),
                    "completed": completed_count,
                    "failed": failed_count,
                    "total": total,
                })
                segment_index += len(segs)
            else:
                # Refund on batch failure
                from app.services.credit_service import refund
                for seg in segs:
                    cost = segment_costs.get(seg.id, 0)
                    try:
                        refund(db, user_id, cost, f"segment:{seg.id}")
                    except Exception:
                        pass
                failed_count += len(segs)
                for seg in segs:
                    yield _sse_format({
                        "type": "segment_failed",
                        "segment_id": seg.id,
                        "error": result.get("error", "Unknown error"),
                        "index": segment_index,
                        "total": total,
                        "completed": completed_count,
                        "failed": failed_count,
                    })
                    segment_index += 1

        # ── Merge audio if any completed ──
        full_audio_url = None
        if completed_count > 0:
            yield _sse_format({
                "type": "progress",
                "step": "merging",
                "message": "合并完整音频...",
            })
            try:
                full_audio_url = _merge_audio_for_project(project_id, db)
            except Exception as exc:
                import logging
                logging.getLogger(__name__).warning("Audio merge failed for project %s: %s", project_id, exc)

        yield _sse_format({
            "type": "complete",
            "full_audio_url": full_audio_url,
            "total_completed": completed_count,
            "total_failed": failed_count,
        })

    finally:
        db.close()


# ── Batch helpers ──

def _get_segment_voice(seg) -> str:
    """Extract voice_id from a segment's role."""
    if seg.role and seg.role.voice_id:
        return seg.role.voice_id
    return "mimo_default"


def _group_by_voice(segments: list) -> list:
    """
    Group consecutive segments with the same voice_id into batches.
    Returns list of {"voice_id": str, "segments": [PodcastSegment, ...]}
    """
    if not segments:
        return []
    batches = []
    current_voice = None
    current_batch = []
    for seg in segments:
        voice = _get_segment_voice(seg)
        if voice != current_voice:
            if current_batch:
                batches.append({"voice_id": current_voice, "segments": current_batch})
            current_batch = [seg]
            current_voice = voice
        else:
            current_batch.append(seg)
    if current_batch:
        batches.append({"voice_id": current_voice, "segments": current_batch})
    return batches


def _synthesize_batch_segments(segs: list, voice_id: str, db) -> dict:
    """
    Synthesize a batch of same-voice segments in one TTS call.
    Merges text with <#N#> pause markers, creates one audio file,
    creates AudioAsset records for each segment pointing to the same file.

    Returns: {"success": bool, "audio_url": str|None, "duration_ms": int, "error": str|None, "provider": str}
    """
    from app.models.audio_asset import AudioAsset
    from app.models.provider_config import load_provider_config
    from app.services.mimo_tts_provider import MiMoTTSProvider
    from app.services.minimax_tts_provider import MiniMaxTTSProvider

    if not segs:
        return {"success": False, "audio_url": None, "duration_ms": 0, "error": "Empty batch", "provider": "none"}

    # Merge text with pause markers between segments
    merged_parts = []
    for i, seg in enumerate(segs):
        if i > 0:
            # Insert pause marker based on previous segment's pause_after_ms
            pause_s = (segs[i - 1].pause_after_ms or 700) / 1000.0
            merged_parts.append(f"<#{pause_s:.1f}#>")
        merged_parts.append(seg.text or "")

    merged_text = "".join(merged_parts)

    # Mark all segments as synthesizing
    now = datetime.now(timezone.utc)
    for seg in segs:
        seg.status = "synthesizing"
        seg.updated_at = now
    db.commit()

    # Load provider config
    provider_config = load_provider_config(db)
    primary = provider_config.get("primary", "mimo")

    audio_data = None
    duration_ms = 0
    provider_name = "mock"

    providers_to_try = [primary]
    fallback_p = provider_config.get("fallback", "")
    if fallback_p and fallback_p != primary:
        providers_to_try.append(fallback_p)
    if "mimo" not in providers_to_try:
        providers_to_try.append("mimo")

    import logging
    log = logging.getLogger(__name__)

    for pk in providers_to_try:
        try:
            if pk == "minimax":
                mm_key = provider_config.get("minimax_api_key", "") or ""
                mm_base = provider_config.get("minimax_api_base", "") or "https://api.minimaxi.com"
                if not mm_key:
                    continue
                client = MiniMaxTTSProvider(api_key=mm_key, api_base=mm_base)
                result = client.synthesize(text=merged_text, voice_id=voice_id)
                audio_data = result["audio_data"]
                duration_ms = result["duration_ms"]
                provider_name = "minimax"
                break
            elif pk == "mimo":
                mk = provider_config.get("mimo_api_key", "") or ""
                mb = provider_config.get("mimo_api_base", "")
                if not mk:
                    continue
                client = MiMoTTSProvider(api_key=mk)
                if mb:
                    client.base_url = mb
                result = client.synthesize(text=merged_text, voice_id=voice_id)
                audio_data = result["audio_data"]
                duration_ms = result["duration_ms"]
                provider_name = "mimo"
                break
            elif pk == "edge-tts":
                edge_on = provider_config.get("edge_tts_enabled", "true").lower() == "true"
                if not edge_on:
                    continue
                try:
                    import asyncio
                    from app.services.tts.edge_tts import EdgeTTSProvider
                    from app.services.tts.models import TTSRequest
                    async def _edge():
                        ep = EdgeTTSProvider(EdgeTTSProvider._default_config())
                        return await ep.synthesize(TTSRequest(text=merged_text, voice_id=voice_id))
                    r = asyncio.run(_edge())
                    audio_data = r.audio_data
                    duration_ms = r.duration_ms
                    provider_name = "edge-tts"
                    break
                except Exception as e:
                    log.warning("Edge-TTS batch failed: %s", e)
                    continue
        except Exception as e:
            log.warning("Provider %s batch failed: %s", pk, e)
            continue

    if audio_data is None:
        # Mock fallback
        import io
        total_chars = sum(len(s.text or "") for s in segs)
        duration_s = max(1, total_chars // 8)
        duration_ms = duration_s * 1000
        sample_rate = 22050
        num_samples = sample_rate * duration_s
        wav_buf = io.BytesIO()
        with wave.open(wav_buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(b"\x00\x00" * num_samples)
        audio_data = wav_buf.getvalue()

    # Save batch audio to one file
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    batch_tag = segs[0].id[:8] if segs else "batch"
    filename = f"batch_{provider_name}_{batch_tag}_{ts}.wav"
    filepath = AUDIO_DIR / filename
    with open(filepath, "wb") as f:
        f.write(audio_data)

    file_size = filepath.stat().st_size
    now2 = datetime.now(timezone.utc)

    # Create one AudioAsset shared by all segments in the batch
    first_seg = segs[0]
    project_id_val = first_seg.script.project_id if first_seg.script else None
    batch_audio_url = f"/static/audio/{filename}"

    # Use one AudioAsset for the whole batch
    asset = None
    # Check if any segment already has an asset
    for seg in segs:
        if seg.audio_asset_id:
            asset = db.query(AudioAsset).filter(AudioAsset.id == seg.audio_asset_id).first()
            if asset:
                break

    if not asset:
        asset = AudioAsset(
            project_id=project_id_val,
            segment_id=first_seg.id,  # reference the first segment
            type="segment",
            format="wav",
            duration_ms=duration_ms,
            file_size=file_size,
            url=batch_audio_url,
            created_at=now2,
        )
        db.add(asset)
        db.flush()
    else:
        asset.url = batch_audio_url
        asset.file_size = file_size
        asset.duration_ms = duration_ms
        asset.updated_at = now2

    # Link all segments to this shared AudioAsset
    for seg in segs:
        seg.audio_asset_id = asset.id
        seg.status = "completed"
        seg.updated_at = now2

    db.commit()

    return {
        "success": True,
        "audio_url": batch_audio_url,
        "duration_ms": duration_ms,
        "error": None,
        "provider": provider_name,
    }


@router.post("/podcasts/{project_id}/synthesize-stream")
def synthesize_stream(
    project_id: str,
    body: BatchSynthesizeRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    SSE streaming endpoint for batch segment synthesis.

    Streams real-time events as segments are synthesized:
    - progress: synthesis step updates
    - segment_complete: a segment finished (includes audio_url for progressive playback)
    - segment_failed: a segment failed
    - complete: all done (includes full_audio_url if merge succeeded)
    - error: fatal error (connection closes)
    """
    if not body.segment_ids:
        raise HTTPException(status_code=400, detail="No segment IDs provided")

    generator = _synthesize_batch_generator(project_id, body.segment_ids, current_user.id)

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
