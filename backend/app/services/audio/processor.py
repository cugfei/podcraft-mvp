"""FFmpeg-based audio processing utilities.

Handles segment concatenation with crossfade, loudness normalisation,
and silence / pause insertion (based on ``<#N#>`` text markup).

Also provides a pure-Python fallback for environments without FFmpeg.
"""

import asyncio
import logging
import os
import re
import shutil
import struct
import tempfile
import wave as _wave
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
# FFmpeg helpers
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
# Unified post-processing (sync entry point — used by routes)
# ---------------------------------------------------------------------------

def _ffmpeg_available() -> bool:
    """Check if ffmpeg binary is on PATH."""
    return shutil.which("ffmpeg") is not None


def _concat_wav_fallback(wav_paths: List[str], output_path: str) -> None:
    """Pure-Python WAV concatenation — no ffmpeg required."""
    if not wav_paths:
        return
    with _wave.open(wav_paths[0], "rb") as first:
        params = first.getparams()
        frames = [first.readframes(first.getnframes())]
        for p in wav_paths[1:]:
            with _wave.open(p, "rb") as w:
                frames.append(w.readframes(w.getnframes()))
    with _wave.open(output_path, "wb") as out:
        out.setparams(params)
        for f in frames:
            out.writeframes(f)


def _normalize_wav_fallback(input_path: str, output_path: str, target_db: float = -18.0) -> None:
    """Pure-Python peak normalization (falls short of LUFS, but better than nothing)."""
    import math
    with _wave.open(input_path, "rb") as wf:
        params = wf.getparams()
        nframes = wf.getnframes()
        raw = wf.readframes(nframes)

    # Find peak amplitude
    fmt = {1: "b", 2: "h", 4: "i"}[params.sampwidth]
    samples = struct.unpack(f"<{nframes * params.nchannels}{fmt}", raw)
    peak = max(abs(s) for s in samples)
    if peak == 0:
        shutil.copy(input_path, output_path)
        return

    # Target peak from dB (0 dBFS = full scale)
    target_peak = int(10 ** (target_db / 20) * (2 ** (params.sampwidth * 8 - 1)))
    gain = target_peak / peak
    adjusted = [int(s * gain) for s in samples]

    with _wave.open(output_path, "wb") as out:
        out.setparams(params)
        out.writeframes(struct.pack(f"<{len(adjusted)}{fmt}", *adjusted))


def post_process_audio(
    wav_paths: List[str],
    output_path: str,
    *,
    crossfade_ms: int = CROSSFADE_MS,
    normalize: bool = True,
    target_lufs: float = TARGET_LUFS,
    bgm_intro: Optional[str] = None,
    bgm_outro: Optional[str] = None,
) -> str:
    """
    Unified audio post-processing pipeline.

    Steps (when ffmpeg is available):
        1. Crossfade-concatenate segments  (50 ms triangular)
        2. EBU R128 loudness normalisation  (-16 LUFS)
        3. Mix BGM intro / outro (optional)

    Falls back to pure-Python WAV concat + peak normalisation when ffmpeg
    is not installed.

    Returns the absolute *output_path*.
    """
    if not wav_paths:
        raise ValueError("No audio files to process")

    # Ensure BGM files exist
    bgm_intro_path = _resolve_bgm(bgm_intro)
    bgm_outro_path = _resolve_bgm(bgm_outro)

    # Single file, no processing needed (unless BGM)
    if len(wav_paths) == 1 and not normalize and not bgm_intro_path and not bgm_outro_path:
        shutil.copy(wav_paths[0], output_path)
        return output_path

    # ── Stage 1: merge segments ──
    if _ffmpeg_available():
        try:
            paths = [Path(p) for p in wav_paths]
            merged = asyncio.run(
                _build_full_wav(paths, crossfade_ms, normalize, target_lufs, output_path)
            )
            logger.info("Post-processed %d segments → %s (FFmpeg)", len(wav_paths), output_path)
        except Exception as exc:
            logger.warning("FFmpeg post-processing failed: %s — falling back to wave concat", exc)
            merged = _fallback_merge(wav_paths, output_path, normalize)
    else:
        merged = _fallback_merge(wav_paths, output_path, normalize)

    # ── Stage 2: mix BGM ──
    if bgm_intro_path or bgm_outro_path:
        final_tmp = str(Path(output_path).with_suffix("")) + "_bgm.wav"
        _mix_bgm_python(str(merged), final_tmp, bgm_intro_path, bgm_outro_path)
        # Replace merged with bgm-mixed version
        if Path(final_tmp).exists():
            shutil.move(final_tmp, output_path)

    return str(Path(output_path))


def _fallback_merge(wav_paths: List[str], output_path: str, normalize: bool) -> Path:
    """Pure-Python merge + optional normalize."""
    if normalize:
        tmp = output_path + ".tmp.wav"
        _concat_wav_fallback(wav_paths, tmp)
        _normalize_wav_fallback(tmp, output_path, target_db=-18.0)
        os.unlink(tmp)
    else:
        _concat_wav_fallback(wav_paths, output_path)
    return Path(output_path)


def _resolve_bgm(name: Optional[str]) -> Optional[Path]:
    """Resolve BGM file name to path. Auto-generates default BGMs if needed."""
    if not name:
        return None
    from app.services.bgm_generator import ensure_bgm_files, BGM_DIR
    bgm_map = ensure_bgm_files()
    path_str = bgm_map.get(name) or name
    path = Path(path_str) if Path(path_str).is_absolute() else BGM_DIR / path_str
    return path if path.exists() else None


def _mix_bgm_python(
    content_path: str,
    output_path: str,
    bgm_intro: Optional[Path],
    bgm_outro: Optional[Path],
) -> None:
    """
    Pure-Python BGM mixing: prepend intro BGM, append outro BGM with fade.
    Structure: [bgm_intro] + [content] + [bgm_outro with fade]
    """
    # Read content audio
    with _wave.open(content_path, "rb") as wf:
        params = wf.getparams()
        content_frames = wf.readframes(wf.getnframes())

    parts: list[bytes] = []

    # Intro BGM
    if bgm_intro and bgm_intro.exists():
        with _wave.open(str(bgm_intro), "rb") as wf:
            # Convert to match content params if needed
            intro_frames = _resample_wav(wf, params)
            if intro_frames:
                parts.append(intro_frames)

    # Content
    parts.append(content_frames)

    # Outro BGM (with fade-out applied)
    if bgm_outro and bgm_outro.exists():
        with _wave.open(str(bgm_outro), "rb") as wf:
            outro_frames = _resample_wav(wf, params)
            if outro_frames:
                # Apply fade-out to the outro
                sampwidth = params.sampwidth
                fmt = {1: "b", 2: "h", 4: "i"}[sampwidth]
                nframes = len(outro_frames) // (sampwidth * params.nchannels)
                samples = struct.unpack(f"<{nframes * params.nchannels}{fmt}", outro_frames)
                fade_n = min(int(1.5 * params.framerate), nframes)  # 1.5s fade
                for i in range(fade_n):
                    factor = (fade_n - i) / fade_n
                    for ch in range(params.nchannels):
                        idx = (nframes - fade_n + i) * params.nchannels + ch
                        if idx < len(samples):
                            samples[idx] = int(samples[idx] * factor)
                outro_frames = struct.pack(f"<{len(samples)}{fmt}", *samples)
                parts.append(outro_frames)

    with _wave.open(output_path, "wb") as out:
        out.setparams(params)
        for p in parts:
            out.writeframes(p)


def _resample_wav(src_wf, target_params) -> bytes:
    """Read a WAV file and resample to match target params. Returns frames bytes."""
    src_rate = src_wf.getframerate()
    src_width = src_wf.getsampwidth()
    src_ch = src_wf.getnchannels()

    target_rate = target_params.framerate
    target_width = target_params.sampwidth
    target_ch = target_params.nchannels

    raw = src_wf.readframes(src_wf.getnframes())
    if not raw:
        return b""

    # If params match, return as-is
    if src_rate == target_rate and src_width == target_width and src_ch == target_ch:
        return raw

    # Simple resampling via nearest-neighbor
    src_fmt = {1: "b", 2: "h", 4: "i"}[src_width]
    n_src = len(raw) // (src_width * src_ch)
    samples = struct.unpack(f"<{n_src * src_ch}{src_fmt}", raw)

    # Resample
    ratio = target_rate / src_rate
    n_tgt = int(n_src * ratio)
    resampled: list[int] = []
    for i in range(n_tgt):
        src_i = int(i / ratio)
        if src_i < n_src:
            for ch in range(min(src_ch, target_ch)):
                resampled.append(samples[src_i * src_ch + ch])

    # Convert sample width if needed
    if target_width != src_width:
        tgt_fmt = {1: "b", 2: "h", 4: "i"}[target_width]
        src_max = 2 ** (src_width * 8 - 1) - 1
        tgt_max = 2 ** (target_width * 8 - 1) - 1
        resampled = [int(s * tgt_max / src_max) for s in resampled]
    else:
        tgt_fmt = src_fmt

    return struct.pack(f"<{len(resampled)}{tgt_fmt}", *resampled)


async def _build_full_wav(
    paths: List[Path],
    crossfade_ms: int,
    normalize: bool,
    target_lufs: float,
    output_path: str,
) -> Path:
    """FFmpeg pipeline that outputs a WAV file."""
    # Step 1: concatenate (to temp mp3)
    concat_mp3 = await concat_segments(paths, crossfade_ms)

    # Step 2: normalize (to temp mp3 or direct to WAV)
    if normalize:
        tmpdir = tempfile.mkdtemp(prefix="podcraft_norm_")
        norm_mp3 = Path(tmpdir) / "normalised.mp3"
        norm_path = await normalise_loudness(concat_mp3, norm_mp3)
    else:
        norm_path = concat_mp3

    # Step 3: convert MP3 → WAV
    out = Path(output_path)
    await _run_ffmpeg([
        "ffmpeg", "-y",
        "-i", str(norm_path),
        "-acodec", "pcm_s16le",
        str(out),
    ], "mp3_to_wav")

    # Cleanup temp dirs
    for tmp_root in [concat_mp3.parent, norm_path.parent]:
        try:
            shutil.rmtree(tmp_root, ignore_errors=True)
        except Exception:
            pass

    return out


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
