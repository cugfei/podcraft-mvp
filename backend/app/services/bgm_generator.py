"""
BGM generator — creates simple background music WAV files for podcast intros/outros.
Inspired by minimax_aipodcast's bgm01.wav / bgm02.wav approach.

Generates synthetic tones using pure Python (no external dependencies).
"""

import math
import struct
import wave
from pathlib import Path
from typing import Optional

# ── Constants ──
BGM_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "bgm"
BGM_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_RATE = 44100
BITS = 16
CHANNELS = 1


def _write_wav(path: Path, samples: list[float], rate: int = SAMPLE_RATE):
    """Write a list of float samples (-1..1) to a WAV file."""
    max_val = 2 ** (BITS - 1) - 1
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(BITS // 8)
        wf.setframerate(rate)
        data = struct.pack(f"<{len(samples)}h", *[int(s * max_val) for s in samples])
        wf.writeframes(data)


def _tone(freq: float, duration_s: float, amplitude: float = 0.3, rate: int = SAMPLE_RATE) -> list[float]:
    """Generate a sine wave tone."""
    n = int(rate * duration_s)
    return [amplitude * math.sin(2 * math.pi * freq * i / rate) for i in range(n)]


def _fade_in(samples: list[float], fade_s: float = 1.0, rate: int = SAMPLE_RATE) -> list[float]:
    """Apply linear fade-in."""
    n_fade = int(rate * fade_s)
    for i in range(min(n_fade, len(samples))):
        samples[i] *= i / n_fade
    return samples


def _fade_out(samples: list[float], fade_s: float = 2.0, rate: int = SAMPLE_RATE) -> list[float]:
    """Apply linear fade-out."""
    n_fade = int(rate * fade_s)
    for i in range(min(n_fade, len(samples))):
        idx = len(samples) - n_fade + i
        if idx >= 0:
            samples[idx] *= (n_fade - i) / n_fade
    return samples


def _mix(*tracks: list[float]) -> list[float]:
    """Mix multiple tracks together (averaging)."""
    if not tracks:
        return []
    max_len = max(len(t) for t in tracks)
    result = [0.0] * max_len
    for t in tracks:
        for i, v in enumerate(t):
            result[i] += v
    return result


def generate_bgm01(output_path: Optional[Path] = None) -> Path:
    """
    BGM01 — gentle intro chime (3 seconds).
    A soft rising tone: C5 → E5 → G5 arpeggio with fade-in.
    """
    path = output_path or BGM_DIR / "bgm01.wav"
    if path.exists():
        return path

    samples: list[float] = []
    for freq, dur in [(523.25, 0.8), (659.25, 0.8), (783.99, 1.4)]:
        samples.extend(_tone(freq, dur, amplitude=0.15))
    samples = _fade_in(samples, fade_s=0.5)
    samples = _fade_out(samples, fade_s=1.0)
    _write_wav(path, samples)
    return path


def generate_bgm02(output_path: Optional[Path] = None) -> Path:
    """
    BGM02 — warm pad chord (5 seconds).
    A soft C major pad (C4+E4+G4) with gentle fade-in/out.
    """
    path = output_path or BGM_DIR / "bgm02.wav"
    if path.exists():
        return path

    duration = 5.0
    c4 = _tone(261.63, duration, amplitude=0.08)
    e4 = _tone(329.63, duration, amplitude=0.06)
    g4 = _tone(392.00, duration, amplitude=0.06)
    samples = _mix(c4, e4, g4)
    samples = _fade_in(samples, fade_s=1.5)
    samples = _fade_out(samples, fade_s=2.0)
    _write_wav(path, samples)
    return path


def ensure_bgm_files():
    """Ensure bgm01.wav and bgm02.wav exist in the BGM directory."""
    b1 = generate_bgm01()
    b2 = generate_bgm02()
    return {"bgm01": str(b1), "bgm02": str(b2)}
