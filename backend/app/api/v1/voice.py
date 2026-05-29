"""Voice preset API — list voices, preview TTS, get supported emotions."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.api.v1.auth import get_current_user
from app.models.voice import VoicePreset
from app.utils.mock_tts import mock_preview
from app.utils.response import success

security = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/voices", tags=["voices"])


# ---- Pydantic schemas ----

class VoicePreviewRequest(BaseModel):
    voice_id: str
    text: str = "你好，这是一段测试语音。"


class VoiceListResponse(BaseModel):
    id: str
    name: str
    provider: Optional[str] = None
    gender: Optional[str] = None
    language: Optional[str] = None
    accent: Optional[str] = None
    preview_text: Optional[str] = None


# ---- Routes ----

@router.get("")
def list_voices(
    language: Optional[str] = None,
    gender: Optional[str] = None,
    provider: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Return preset voice list.
    Optional filters: language, gender, provider.
    """
    query = db.query(VoicePreset).filter(VoicePreset.status == "active")

    if language:
        query = query.filter(VoicePreset.language == language)
    if gender:
        query = query.filter(VoicePreset.gender == gender)
    if provider:
        query = query.filter(VoicePreset.provider == provider)

    voices = query.order_by(VoicePreset.name).all()

    # Fallback: if no voices in DB, return hardcoded presets
    if not voices:
        fallback = [
            {
                "id": "voice-001",
                "name": "Mini (活泼女声)",
                "provider": "minimax",
                "provider_voice_id": "Chinese (Mandarin)_Gentle_Senior",
                "gender": "female",
                "language": "zh-CN",
                "accent": "mandarin",
                "preview_text": "你好，我是Mini，一起聊天吧。",
            },
            {
                "id": "voice-002",
                "name": "Max (稳重男声)",
                "provider": "minimax",
                "provider_voice_id": "Boyan_new_platform",
                "gender": "male",
                "language": "zh-CN",
                "accent": "mandarin",
                "preview_text": "你好，我是Max，很高兴认识你。",
            },
            {
                "id": "voice-003",
                "name": "Lina（英音女声）",
                "provider": "edge-tts",
                "provider_voice_id": "en-US-AriaNeural",
                "gender": "female",
                "language": "en-US",
                "accent": "american",
                "preview_text": "Hello, I'm Lina.",
            },
            {
                "id": "voice-004",
                "name": "粤语阿明（男声）",
                "provider": "minimax",
                "provider_voice_id": "Chinese (Cantonese)_Male",
                "gender": "male",
                "language": "zh-YUE",
                "accent": "cantonese",
                "preview_text": "你好，我係阿明。",
            },
            {
                "id": "voice-005",
                "name": "川味小妹（女声）",
                "provider": "minimax",
                "provider_voice_id": "Chinese (Sichuan)_Female",
                "gender": "female",
                "language": "zh-CN",
                "accent": "sichuan",
                "preview_text": "巴适得板！",
            },
            {
                "id": "voice-101",
                "name": "冰糖 (甜美女声)",
                "provider": "mimo",
                "provider_voice_id": "冰糖",
                "gender": "female",
                "language": "zh-CN",
                "preview_text": "你好呀，我是冰糖。",
            },
            {
                "id": "voice-102",
                "name": "白桦 (沉稳男声)",
                "provider": "mimo",
                "provider_voice_id": "白桦",
                "gender": "male",
                "language": "zh-CN",
                "preview_text": "你好，我是白桦。",
            },
        ]
        return success(fallback)

    return success([
        {
            "id": str(v.id),
            "name": v.name,
            "provider": v.provider,
            "provider_voice_id": v.provider_voice_id,
            "gender": v.gender,
            "language": v.language,
            "preview_text": v.voice_params.get("preview_text") if v.voice_params else None,
        }
        for v in voices
    ])


@router.post("/preview")
def preview_voice(
    body: VoicePreviewRequest,
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Generate a preview audio for a voice preset.
    No credit deduction.
    """
    user = None
    if creds:
        try:
            user = get_current_user(creds, db)
        except Exception:
            pass

    # Verify voice exists
    voice = db.query(VoicePreset).filter(VoicePreset.id == body.voice_id).first()
    if not voice:
        raise HTTPException(status_code=404, detail="Voice preset not found")

    # Generate preview audio (mock)
    audio_url = mock_preview(db, voice_id=body.voice_id, text=body.text)

    return success({
        "audio_url": audio_url,
        "voice_id": body.voice_id,
        "text": body.text,
    })


@router.get("/{voice_id}/emotions")
def get_voice_emotions(
    voice_id: str,
    db: Session = Depends(get_db),
):
    """
    Return supported emotion styles for a voice preset.
    MVP: returns fixed list; production will query TTS provider capabilities.
    """
    voice = db.query(VoicePreset).filter(VoicePreset.id == voice_id).first()
    if not voice:
        raise HTTPException(status_code=404, detail="Voice preset not found")

    # MVP: all voices support these emotions
    emotions = [
        {"value": "neutral", "label": "自动（中性）"},
        {"value": "happy", "label": "开心"},
        {"value": "sad", "label": "悲伤"},
        {"value": "angry", "label": "愤怒"},
        {"value": "surprised", "label": "惊讶"},
        {"value": "calm", "label": "平静"},
    ]

    return success(emotions)
