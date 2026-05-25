"""TTS service package."""

from app.services.tts.models import (
    TTSRequest,
    TTSResponse,
    TTSProviderConfig,
    TTSEmotion,
    TTSVoiceEffect,
)
from app.services.tts.base import BaseTTSProvider
from app.services.tts.minimax import MiniMaxProvider
from app.services.tts.edge_tts import EdgeTTSProvider
from app.services.tts.factory import tts_registry, TTSProviderRegistry

__all__ = [
    "TTSRequest",
    "TTSResponse",
    "TTSProviderConfig",
    "TTSEmotion",
    "TTSVoiceEffect",
    "BaseTTSProvider",
    "MiniMaxProvider",
    "EdgeTTSProvider",
    "tts_registry",
    "TTSProviderRegistry",
]
