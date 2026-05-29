"""
MiniMax Speech-2.8-turbo TTS Provider — synchronous wrapper.
Calls the MiniMax T2A v2 API and returns audio bytes consistently with MiMo.
"""

import base64
import io
import logging
import time
import wave
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ── MiniMax default voice IDs (from minimax_aipodcast config) ──
VOICE_PRESETS = {
    "minimax_mini": "Chinese (Mandarin)_Gentle_Senior",  # 活泼亲切 女声
    "minimax_max": "Boyan_new_platform",                  # 稳重专业 男声
}

# MiniMax voice display names for UI
VOICE_DISPLAY_MAP = {
    "Chinese (Mandarin)_Gentle_Senior": "Mini (活泼女声)",
    "Boyan_new_platform": "Max (稳重男声)",
}

MODEL = "speech-2.8-turbo"


class MiniMaxTTSProvider:
    """Synchronous MiniMax TTS provider — compatible with MiMo interface."""

    def __init__(self, api_key: Optional[str] = None, api_base: Optional[str] = None):
        self.api_key = api_key or ""
        self.api_base = (api_base or "https://api.minimaxi.com").rstrip("/")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def synthesize(
        self,
        text: str,
        voice_id: str = "Chinese (Mandarin)_Gentle_Senior",
        speed: float = 1.0,
        pitch: int = 0,
        volume: float = 1.0,
        emotion: str = "neutral",
        language: str = "zh-CN",
        fmt: str = "wav",
    ) -> dict:
        """
        Synthesise speech via MiniMax T2A v2.
        Returns: {"audio_data": bytes, "duration_ms": int, "format": str}
        """
        if not self.api_key:
            raise ValueError("MiniMax API Key not configured")

        start = time.monotonic()
        payload = self._build_payload(text, voice_id, speed, pitch, volume, fmt)
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=30) as client:
                resp = client.post(
                    f"{self.api_base}/v1/t2a_v2",
                    json=payload,
                    headers=headers,
                )
        except httpx.RequestError as exc:
            raise RuntimeError(f"MiniMax network error: {exc}") from exc

        if resp.status_code == 429:
            raise RuntimeError("MiniMax rate-limited (429)")
        if resp.status_code == 401:
            raise RuntimeError("MiniMax authentication failed (401) — check API Key")
        resp.raise_for_status()

        data = resp.json()
        base_resp = data.get("base_resp", {})
        if base_resp.get("status_code", -1) != 0:
            raise RuntimeError(
                f"MiniMax API error {base_resp.get('status_code')}: {base_resp.get('status_msg', 'unknown')}"
            )

        audio_hex = data.get("data", {}).get("audio")
        if not audio_hex:
            raise RuntimeError("MiniMax returned empty audio payload")

        # Decode hex → bytes → WAV (MiniMax returns raw PCM sometimes)
        try:
            audio_bytes = bytes.fromhex(audio_hex)
        except (ValueError, TypeError):
            audio_bytes = base64.b64decode(audio_hex) if audio_hex else b""

        if not audio_bytes:
            raise RuntimeError("MiniMax returned zero-length audio")

        # Wrap raw PCM in WAV container if needed
        duration_ms = int((time.monotonic() - start) * 1000)
        if fmt == "wav" and not audio_bytes[:4] == b"RIFF":
            audio_bytes = self._pcm_to_wav(audio_bytes)
            # Estimate true duration from sample count
            with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
                duration_ms = int(wf.getnframes() / wf.getframerate() * 1000)

        return {
            "audio_data": audio_bytes,
            "duration_ms": duration_ms,
            "format": fmt,
        }

    def health_check(self) -> bool:
        """Quick connectivity probe."""
        try:
            with httpx.Client(timeout=5) as client:
                resp = client.get(f"{self.api_base}/v1/t2a_v2")
            return resp.status_code < 500
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_payload(
        self,
        text: str,
        voice_id: str,
        speed: float,
        pitch: int,
        volume: float,
        fmt: str,
    ) -> dict:
        return {
            "model": MODEL,
            "text": text,
            "stream": False,
            "voice_setting": {
                "voice_id": voice_id,
                "speed": max(0.5, min(2.0, speed)),
                "pitch": pitch,
                "vol": max(0.1, min(2.0, 1.0 + volume)),
            },
            "audio_setting": {
                "sample_rate": 32000,
                "format": fmt,
            },
        }

    @staticmethod
    def _pcm_to_wav(pcm_data: bytes, sample_rate: int = 32000, channels: int = 1, bits: int = 16) -> bytes:
        """Wrap raw PCM bytes in a RIFF WAV container."""
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(channels)
            wf.setsampwidth(bits // 8)
            wf.setframerate(sample_rate)
            wf.writeframes(pcm_data)
        return buf.getvalue()
