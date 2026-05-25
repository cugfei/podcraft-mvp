"""Microsoft Edge-TTS provider (free, as fallback)."""

import logging
import time
from typing import Optional

import edge_tts

from .base import BaseTTSProvider
from .models import TTSRequest, TTSResponse, TTSProviderConfig

logger = logging.getLogger(__name__)

# Voice mapping: podcraft-style ID → edge-tts ShortName
_VOICE_MAP: dict[str, str] = {
    # Female voices
    "zh-CN-XiaoxiaoNeural": "zh-CN-XiaoxiaoNeural",
    "zh-CN-XiaoyiNeural": "zh-CN-XiaoyiNeural",
    "xiaoxiao": "zh-CN-XiaoxiaoNeural",
    "xiaoyi": "zh-CN-XiaoyiNeural",
    # Male voices
    "zh-CN-YunxiNeural": "zh-CN-YunxiNeural",
    "zh-CN-YunjianNeural": "zh-CN-YunjianNeural",
    "yunxi": "zh-CN-YunxiNeural",
    "yunjian": "zh-CN-YunjianNeural",
    # English
    "en-US-JennyNeural": "en-US-JennyNeural",
    "en-US-GuyNeural": "en-US-GuyNeural",
}

def _resolve_voice(voice_id: str) -> str:
    return _VOICE_MAP.get(voice_id, "zh-CN-XiaoxiaoNeural")


class EdgeTTSProvider(BaseTTSProvider):
    """Free TTS provider backed by Microsoft Edge browser TTS.

    Limitations vs MiniMax:
        - No emotion / voice_effect support (ignored silently).
        - Speed/pitch use edge-tts string syntax (``+20%`` / ``-10Hz``).
        - Lower audio quality (MOS ≈ 3.0 — PRD §9.3).
    """

    async def synthesize(self, request: TTSRequest) -> TTSResponse:
        start = time.monotonic()
        voice = _resolve_voice(request.voice_id)

        rate_str = f"{int((request.speed - 1.0) * 100):+d}%"
        pitch_str = f"{int(request.pitch * 10):+d}Hz"

        communicate = edge_tts.Communicate(
            text=request.text,
            voice=voice,
            rate=rate_str,
            pitch=pitch_str,
        )

        chunks: list[bytes] = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])

        if not chunks:
            raise RuntimeError("Edge-TTS returned empty audio stream")

        audio_data = b"".join(chunks)
        duration_ms = int((time.monotonic() - start) * 1000)

        return TTSResponse(
            audio_data=audio_data,
            format=request.output_format,
            duration_ms=duration_ms,
            provider="edge-tts",
            request_id="",
        )

    async def health_check(self) -> bool:
        try:
            communicate = edge_tts.Communicate("test", "zh-CN-XiaoxiaoNeural")
            async for _chunk in communicate.stream():
                return True
        except Exception:
            return False
        return True
