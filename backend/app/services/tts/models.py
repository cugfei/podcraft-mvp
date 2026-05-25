"""TTS request / response models and provider configuration."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class TTSEmotion(str, Enum):
    """Emotional tone for voice synthesis (PRD V3.0 §7.4)."""

    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    CALM = "calm"
    EXCITED = "excited"


class TTSVoiceEffect(str, Enum):
    """Post-processing voice effects (PRD V3.0 §7.4)."""

    RADIO = "radio"
    TELEPHONE = "telephone"
    MEGAPHONE = "megaphone"


@dataclass
class TTSRequest:
    """Normalized synthesis request — provider-agnostic."""

    text: str
    voice_id: str
    speed: float = 1.0
    pitch: float = 0.0  # -12 .. +12 semitones
    volume: float = 0.0  # 0.0 .. 2.0 linear scale
    emotion: Optional[TTSEmotion] = None
    language: str = "zh-CN"
    voice_effect: Optional[TTSVoiceEffect] = None
    output_format: str = "mp3"


@dataclass
class TTSResponse:
    """Normalized synthesis result — provider-agnostic."""

    audio_data: bytes
    format: str = "mp3"
    duration_ms: int = 0
    provider: str = ""
    request_id: str = ""


@dataclass
class TTSProviderConfig:
    """Runtime configuration for a single TTS provider."""

    name: str
    api_key: str = ""
    api_base: str = ""
    max_qps: int = 10
    timeout_seconds: int = 30
    enabled: bool = True
