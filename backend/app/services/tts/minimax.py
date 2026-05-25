"""MiniMax Speech-2.8-turbo TTS provider."""

import base64
import logging
import time
from typing import Any, Optional

import httpx

from .base import BaseTTSProvider
from .models import TTSRequest, TTSResponse, TTSProviderConfig, TTSEmotion, TTSVoiceEffect

logger = logging.getLogger(__name__)


class MiniMaxProvider(BaseTTSProvider):
    """Calls the MiniMax T2A v2 API (Speech-2.8-turbo)."""

    MODEL = "speech-2.8-turbo"

    async def synthesize(self, request: TTSRequest) -> TTSResponse:
        start = time.monotonic()
        payload = self._build_payload(request)

        async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
            resp = await client.post(
                f"{self.config.api_base}/v1/t2a_v2",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                },
            )

        if resp.status_code == 429:
            raise RuntimeError("MiniMax rate-limited (429)")
        if resp.status_code == 401:
            raise RuntimeError("MiniMax authentication failed (401)")
        resp.raise_for_status()

        data = resp.json()
        base_resp = data.get("base_resp", {})
        if base_resp.get("status_code", -1) != 0:
            raise RuntimeError(f"MiniMax API error: {base_resp.get('status_msg', 'unknown')}")

        audio_b64 = data.get("data", {}).get("audio")
        if not audio_b64:
            raise RuntimeError("MiniMax returned empty audio payload")

        duration_ms = int((time.monotonic() - start) * 1000)
        return TTSResponse(
            audio_data=base64.b64decode(audio_b64),
            format=request.output_format,
            duration_ms=duration_ms,
            provider="minimax",
            request_id=data.get("trace_id", ""),
        )

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    f"{self.config.api_base}/v1/text/chatcompletion_v2",
                    headers={"Authorization": f"Bearer {self.config.api_key}"},
                )
            return resp.status_code < 500
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Payload construction
    # ------------------------------------------------------------------

    def _build_payload(self, req: TTSRequest) -> dict[str, Any]:
        voice_setting: dict[str, Any] = {
            "voice_id": req.voice_id,
            "speed": req.speed,
            "pitch": int(req.pitch),
            "vol": max(0.0, min(2.0, 1.0 + req.volume)),
        }
        audio_setting: dict[str, Any] = {
            "sample_rate": 32000,
            "format": req.output_format,
        }

        body: dict[str, Any] = {
            "model": self.MODEL,
            "text": req.text,
            "stream": False,
            "voice_setting": voice_setting,
            "audio_setting": audio_setting,
        }

        if req.emotion:
            body["emotion"] = req.emotion.value
        if req.voice_effect:
            body["voice_effect"] = req.voice_effect.value
        if req.language and req.language != "zh-CN":
            body["language_boost"] = req.language

        return body
