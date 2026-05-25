"""FFmpeg-based audio processing utilities.

Handles segment concatenation with crossfade, loudness normalisation,
and silence / pause insertion (based on ``<#N#>`` text markup).
"""

import asyncio
import logging
import os
import re
import tempfile
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CROSSFADE_MS = 50          # 50 ms overlap between adjacent segments
TARGET_LUFS = -16.0        # EBU R128 integrated loudness target
PAUSE_SILENCE_PADDING = 10  # ms padding around pauses

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _run_ffmpeg(args: List[str], label: str = "ffmpeg") -> bytes:
    """Execute an FFmpeg command and return stdout bytes."""
    logger.debug("FFmpeg %s: %s", label, " ".join(args))
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        msg = stderr.decode(errors="replace").strip()[-500:]
        raise RuntimeError(f"FFmpeg {label} failed (rc={proc.returncode}): {msg}")
    return stdout


def _probe_duration_ms(path: Path) -> int:
    """Get the duration of an audio file in milliseconds via ``ffprobe``."""
    import subprocess
    result = subprocess.run(
        [
            "ffprobe",
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "csv=p=0",
            str(path),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr.strip()}")
    return int(float(result.stdout.strip()) * 1000)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_silence(duration_ms: int, output: Path) -> Path:
    """Create a silent MP3 of the given duration."""
    duration_s = duration_ms / 1000.0
    await _run_ffmpeg([
        "ffmpeg", "-y",
        "-f", "lavfi",
        "-i", f"anullsrc=r=44100:cl=mono",
        "-t", str(duration_s),
        "-c:a", "libmp3lame",
        "-q:a", "9",
        str(output),
    ], "silence")
    return output


async def concat_segments(
    audio_paths: List[Path],
    crossfade_ms: int = CROSSFADE_MS,
) -> Path:
    """Concatenate audio segments with crossfade.

    Returns the path to the concatenated file in a temporary directory.
    """
    if not audio_paths:
        raise ValueError("No segments to concatenate")

    if len(audio_paths) == 1:
        return audio_paths[0]

    tmpdir = tempfile.mkdtemp(prefix="podcraft_concat_")

    if crossfade_ms <= 0:
        # Simple concat without crossfade
        list_file = Path(tmpdir) / "list.txt"
        list_file.write_text(
            "\n".join(f"file '{p}'" for p in audio_paths),
            encoding="utf-8",
        )
        output = Path(tmpdir) / "concat.mp3"
        await _run_ffmpeg([
            "ffmpeg", "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(list_file),
            "-c", "copy",
            str(output),
        ], "concat")
        return output

    # Crossfade concat — iterate pairwise
    current = audio_paths[0]
    for i, next_file in enumerate(audio_paths[1:], start=1):
        crossfade_s = crossfade_ms / 1000.0
        out = Path(tmpdir) / f"cf_{i:04d}.mp3"
        # Get durations to calculate offset
        dur1 = _probe_duration_ms(current) / 1000.0
        offset = max(0, dur1 - crossfade_s)
        await _run_ffmpeg([
            "ffmpeg", "-y",
            "-i", str(current),
            "-i", str(next_file),
            "-filter_complex",
            f"[0][1]acrossfade=d={crossfade_s}:c1=tri:c2=tri",
            str(out),
        ], f"crossfade_{i}")
        current = out

    return current


async def normalise_loudness(input_path: Path, output_path: Path) -> Path:
    """Apply EBU R128 loudness normalisation to *input_path*."""
    await _run_ffmpeg([
        "ffmpeg", "-y",
        "-i", str(input_path),
        "-af", f"loudnorm=I={TARGET_LUFS}:TP=-1.5:LRA=11",
        "-c:a", "libmp3lame",
        "-q:a", "2",
        str(output_path),
    ], "loudnorm")
    return output_path


async def build_full_audio(
    segment_paths: List[Path],
    pauses_ms: Optional[List[int]] = None,
    crossfade_ms: int = CROSSFADE_MS,
    normalise: bool = True,
) -> Path:
    """End-to-end pipeline: build a full podcast MP3 from segment files.

    Steps:
        1. Insert silent pauses between segments (if specified).
        2. Concatenate with crossfade.
        3. Normalise loudness (EBU R128).

    Returns the absolute path to the final MP3.
    """
    # Step 1: Insert pauses
    segments_with_pauses: List[Path] = []
    if pauses_ms:
        for i, (seg, pause) in enumerate(zip(segment_paths, pauses_ms)):
            segments_with_pauses.append(seg)
            if pause > 0:
                tmpdir = tempfile.mkdtemp(prefix="podcraft_pause_")
                silence = Path(tmpdir) / f"pause_{i:04d}.mp3"
                await generate_silence(pause, silence)
                segments_with_pauses.append(silence)
    else:
        segments_with_pauses = segment_paths

    # Step 2: Concatenate
    concat_path = await concat_segments(segments_with_pauses, crossfade_ms)

    # Step 3: Normalise
    if normalise:
        tmpdir = tempfile.mkdtemp(prefix="podcraft_norm_")
        norm_path = Path(tmpdir) / "normalised.mp3"
        return await normalise_loudness(concat_path, norm_path)

    return concat_path


# ---------------------------------------------------------------------------
# Pause text parser
# ---------------------------------------------------------------------------

_PAUSE_RE = re.compile(r"<#([\d.]+)#>")


def parse_pause_tags(text: str) -> List[dict]:
    """Extract ``<#N#>`` pause markers from text.

    Returns a list of ``{"pos": int, "seconds": float}`` dicts.
    """
    return [
        {"pos": m.start(), "seconds": float(m.group(1))}
        for m in _PAUSE_RE.finditer(text)
    ]


def strip_pause_tags(text: str) -> str:
    """Remove ``<#N#>`` pause markers from *text*."""
    return _PAUSE_RE.sub("", text)
