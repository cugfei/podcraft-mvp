"""
Mock TTS helper – generate silent WAV files for MVP testing.
In production this will be replaced by real TTS Provider implementations.
"""

import io
import wave
import struct
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.models.audio_asset import AudioAsset
from app.models.voice import VoicePreset

# Directory for storing generated audio files (relative to backend root)
AUDIO_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def mock_synthesize(
    db: Session,
    project_id: str,
    segment_id: Optional[str],
    text: str,
    voice_id: str,
    speed: float = 1.0,
    pitch: int = 0,
    volume: float = 1.0,
    emotion: str = "neutral",
    language: str = "zh-CN",
) -> AudioAsset:
    """
    Mock TTS synthesis – generates a silent WAV file and returns an AudioAsset.

    Args:
        db: SQLAlchemy session.
        project_id: Parent podcast project ID.
        segment_id: Associated segment ID (optional).
        text: Text to synthesize (used for filename only in mock).
        voice_id: Voice preset ID.
        speed, pitch, volume, emotion, language: TTS parameters (ignored in mock).

    Returns:
        AudioAsset instance with file saved to static/audio/.
    """
    # Determine duration: ~0.5s per 50 chars, min 2s, max 30s
    char_count = len(text)
    duration_sec = max(2.0, min(30.0, char_count * 0.01))
    duration_ms = int(duration_sec * 1000)

    # Generate silent WAV
    sample_rate = 22050
    num_samples = int(sample_rate * duration_sec)
    amplitude = 0  # silent

    wav_buffer = io.BytesIO()
    with wave.open(wav_buffer, "wb") as wav_file:
        wav_file.setnchannels(1)  # mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        frames = struct.pack(f"<{num_samples}h", *([amplitude] * num_samples))
        wav_file.writeframes(frames)
    wav_buffer.seek(0)

    # Save to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"mock_{project_id}_{segment_id or 'preview'}_{timestamp}.wav"
    file_path = AUDIO_DIR / filename
    with open(file_path, "wb") as f:
        f.write(wav_buffer.read())

    file_size = file_path.stat().st_size
    relative_url = f"/static/audio/{filename}"

    # Create AudioAsset record
    asset = AudioAsset(
        project_id=project_id,
        segment_id=segment_id,
        type="segment" if segment_id else "preview",
        format="wav",
        duration_ms=duration_ms,
        file_size=file_size,
        url=relative_url,
        version=1,
        expires_at=datetime.now() + timedelta(days=30),  # T-5.6: 30-day lifecycle
    )
    db.add(asset)
    db.flush()  # get ID

    return asset


def mock_preview(
    db: Session,
    voice_id: str,
    text: str = "你好，这是一段测试语音。",
) -> str:
    """
    Generate a preview audio file for a voice preset.

    Args:
        db: SQLAlchemy session.
        voice_id: Voice preset ID.
        text: Preview text.

    Returns:
        URL path for the preview audio file.
    """
    # Use a fake project_id for preview
    asset = mock_synthesize(
        db=db,
        project_id="00000000-0000-0000-0000-000000000000",
        segment_id=None,
        text=text,
        voice_id=voice_id,
    )
    db.commit()
    return asset.url
