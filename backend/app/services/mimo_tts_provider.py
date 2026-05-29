"""
MiMo v2.5 TTS Provider – 小米 MiMo 语音合成服务
API 文档: https://platform.xiaomimimo.com/docs/zh-CN/usage-guide/speech-synthesis-v2.5
"""

import os
import base64
import logging
from typing import Optional
from pathlib import Path
from datetime import datetime, timedelta

import httpx
from sqlalchemy.orm import Session

from app.models.audio_asset import AudioAsset

logger = logging.getLogger(__name__)

# MiMo API 配置
MIMO_API_BASE = os.getenv("MIMO_API_BASE", "https://token-plan-cn.xiaomimimo.com/v1")
MIMO_API_KEY = os.getenv("MIMO_API_KEY", "")

# 音频输出目录
AUDIO_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# 预置音色映射
VOICE_PRESETS = {
    # 中文音色
    "mimo_default": {"name": "MiMo-默认", "language": "zh", "gender": "neutral"},
    "冰糖": {"name": "冰糖", "language": "zh", "gender": "female"},
    "茉莉": {"name": "茉莉", "language": "zh", "gender": "female"},
    "苏打": {"name": "苏打", "language": "zh", "gender": "male"},
    "白桦": {"name": "白桦", "language": "zh", "gender": "male"},
    # 英文音色
    "Mia": {"name": "Mia", "language": "en", "gender": "female"},
    "Chloe": {"name": "Chloe", "language": "en", "gender": "female"},
    "Milo": {"name": "Milo", "language": "en", "gender": "male"},
    "Dean": {"name": "Dean", "language": "en", "gender": "male"},
}


class MiMoTTSProvider:
    """小米 MiMo v2.5 TTS 语音合成 Provider"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or MIMO_API_KEY
        self.base_url = MIMO_API_BASE
        if not self.api_key:
            logger.warning("MiMo API Key not configured")

    def synthesize(
        self,
        text: str,
        voice_id: str = "mimo_default",
        speed: float = 1.0,
        pitch: int = 0,
        volume: float = 1.0,
        emotion: str = "neutral",
        language: str = "zh",
        format: str = "wav",
    ) -> dict:
        """
        调用 MiMo v2.5 TTS API 合成语音

        Args:
            text: 要合成的文本
            voice_id: 音色 ID (如 "mimo_default", "冰糖", "Chloe" 等)
            speed: 语速 (0.5-2.0)
            pitch: 音调 (-12 to 12)
            volume: 音量 (0.0-2.0)
            emotion: 情感风格
            language: 语言
            format: 音频格式 (wav/pcm16)

        Returns:
            dict: {"audio_data": bytes, "duration_ms": int, "format": str}
        """
        if not self.api_key:
            raise ValueError("MiMo API Key not configured. Set MIMO_API_KEY environment variable.")

        # 构建自然语言风格控制指令
        style_prompt = self._build_style_prompt(speed, pitch, volume, emotion)

        # 构建请求体
        messages = []
        if style_prompt:
            messages.append({"role": "user", "content": style_prompt})
        messages.append({"role": "assistant", "content": text})

        payload = {
            "model": "mimo-v2.5-tts",
            "messages": messages,
            "audio": {
                "format": format,
                "voice": voice_id,
            },
            "stream": False,
        }

        # 调用 API
        # Token Plan (OpenRouter) uses Bearer auth; native MiMo uses "api-key" header
        auth_header = "api-key"
        # Auto-detect: OpenRouter keys start with "sk-or-"
        if self.api_key.startswith("sk-or-"):
            auth_header = "Authorization"
            headers = {
                "Content-Type": "application/json",
                auth_header: f"Bearer {self.api_key}",
            }
        else:
            headers = {
                "Content-Type": "application/json",
                auth_header: self.api_key,
            }

        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                result = response.json()

            # 解析响应
            choices = result.get("choices", [])
            audio_data_b64 = ""
            if choices:
                audio_data_b64 = choices[0].get("message", {}).get("audio", {}).get("data", "")
            if not audio_data_b64:
                raise ValueError("No audio data in response")

            audio_data = base64.b64decode(audio_data_b64)

            # 估算时长 (WAV: ~24kHz, 16-bit, mono)
            # WAV header is 44 bytes, rest is audio data
            sample_rate = 24000
            bytes_per_sample = 2  # 16-bit
            channels = 1
            audio_data_size = len(audio_data) - 44  # subtract WAV header
            duration_ms = int((audio_data_size / (sample_rate * bytes_per_sample * channels)) * 1000)

            return {
                "audio_data": audio_data,
                "duration_ms": max(duration_ms, 1000),  # minimum 1 second
                "format": format,
            }

        except httpx.HTTPStatusError as e:
            logger.error("MiMo API HTTP error: %s - %s", e.response.status_code, e.response.text)
            raise ValueError(f"MiMo API error: {e.response.status_code}")
        except Exception as e:
            logger.error("MiMo API call failed: %s", e)
            raise

    def _build_style_prompt(
        self,
        speed: float = 1.0,
        pitch: int = 0,
        volume: float = 1.0,
        emotion: str = "neutral",
    ) -> str:
        """构建自然语言风格控制指令"""
        parts = []

        # 情感控制
        emotion_map = {
            "happy": "开心愉悦的语气",
            "sad": "悲伤低沉的语气",
            "angry": "愤怒激动的语气",
            "calm": "平静温和的语气",
            "excited": "兴奋热情的语气",
            "neutral": "",
        }
        if emotion in emotion_map and emotion_map[emotion]:
            parts.append(emotion_map[emotion])

        # 语速控制
        if speed < 0.8:
            parts.append("语速较慢")
        elif speed > 1.2:
            parts.append("语速较快")

        # 音调控制
        if pitch < -3:
            parts.append("音调低沉")
        elif pitch > 3:
            parts.append("音调高昂")

        if parts:
            return "请用" + "、".join(parts) + "的风格朗读以下内容。"
        return ""

    def list_voices(self) -> list[dict]:
        """列出所有可用音色"""
        voices = []
        for voice_id, info in VOICE_PRESETS.items():
            voices.append({
                "id": voice_id,
                "name": info["name"],
                "language": info["language"],
                "gender": info["gender"],
                "provider": "mimo",
            })
        return voices


# 全局实例
_mimo_provider: Optional[MiMoTTSProvider] = None


def get_mimo_provider() -> MiMoTTSProvider:
    """获取 MiMo TTS Provider 单例"""
    global _mimo_provider
    if _mimo_provider is None:
        _mimo_provider = MiMoTTSProvider()
    return _mimo_provider
