"""
Podcast cover image generator.
Supports text-based generation (Pillow) and MiniMax AI image API.

Inspired by minimax_aipodcast's ``generate_cover_image`` approach.
"""

import io
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ── Constants ──
COVER_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "covers"
COVER_DIR.mkdir(parents=True, exist_ok=True)

COVER_WIDTH = 512
COVER_HEIGHT = 512


# ══════════════════════════════════════════════════════════════════════
# Text-based cover (Pillow — MVP, no API required)
# ══════════════════════════════════════════════════════════════════════

def generate_text_cover(
    title: str,
    output_path: Optional[Path] = None,
    width: int = COVER_WIDTH,
    height: int = COVER_HEIGHT,
) -> Path:
    """
    Generate a simple gradient + text podcast cover using Pillow.
    No external API required.
    """
    from PIL import Image, ImageDraw, ImageFont

    path = output_path or COVER_DIR / f"cover_{_safe_filename(title)}.png"
    if path.exists():
        return path

    # Create gradient background (deep purple → dark blue)
    img = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        r = int(40 + (80 - 40) * y / height)
        g = int(20 + (60 - 20) * y / height)
        b = int(80 + (140 - 80) * y / height)
        for x in range(width):
            img.putpixel((x, y), (r, g, b))

    # Title text — try system fonts, fall back to default
    try:
        font_large = ImageFont.truetype("arial.ttf", 36)
        font_small = ImageFont.truetype("arial.ttf", 18)
    except OSError:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Draw title (word-wrapped)
    words = title[:60].split()
    lines: list = []
    current = ""
    for w in words:
        test = f"{current} {w}".strip()
        if draw.textlength(test, font=font_large) < width - 80:
            current = test
        else:
            lines.append(current)
            current = w
    if current:
        lines.append(current)

    y_offset = height // 2 - len(lines) * 25
    for line in lines:
        tw = draw.textlength(line, font=font_large)
        draw.text(((width - tw) / 2, y_offset), line, fill=(255, 255, 255, 220), font=font_large)
        y_offset += 50

    # Subtitle
    sub = "PodCraft AI 播客"
    sw = draw.textlength(sub, font=font_small)
    draw.text(((width - sw) / 2, height - 60), sub, fill=(200, 200, 255, 180), font=font_small)

    # Mic icon (simple circle + rectangle)
    cx, cy = width // 2, 60
    draw.ellipse([cx - 25, cy - 30, cx + 25, cy + 10], outline=(255, 255, 255, 150), width=2)
    draw.rectangle([cx - 5, cy + 10, cx + 5, cy + 30], fill=(255, 255, 255, 150))

    img.save(str(path), "PNG")
    logger.info("Generated text cover: %s", path)
    return path


# ══════════════════════════════════════════════════════════════════════
# MiniMax AI cover (when API key is configured)
# ══════════════════════════════════════════════════════════════════════

def generate_ai_cover(
    title: str,
    api_key: str,
    api_base: str = "https://api.minimaxi.com",
    style: str = "comic",
    output_path: Optional[Path] = None,
) -> Optional[Path]:
    """
    Generate podcast cover using MiniMax image generation API.
    Falls back to None on failure — caller should use text-based cover.
    """
    import httpx
    import base64

    path = output_path or COVER_DIR / f"cover_ai_{_safe_filename(title)}.png"

    prompt = f"Podcast cover art for '{title[:80]}'. {style} style, minimalist, vibrant colors, professional podcast artwork, center composition."

    payload = {
        "model": "image-01-live",
        "prompt": prompt,
        "aspect_ratio": "1:1",
        "n": 1,
        "prompt_optimizer": True,
        "style": style,
        "style_weight": 1,
    }

    try:
        with httpx.Client(timeout=90) as client:
            resp = client.post(
                f"{api_base}/v1/image_generation",
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
        resp.raise_for_status()
        data = resp.json()

        base_resp = data.get("base_resp", {})
        if base_resp.get("status_code", -1) != 0:
            logger.warning("MiniMax image API error: %s", base_resp.get("status_msg"))
            return None

        images = data.get("data", {}).get("image_urls") or data.get("data", {}).get("images") or []
        if not images:
            return None

        image_data = images[0]
        # Could be URL or base64
        if image_data.startswith("http"):
            # Download from URL
            img_resp = client.get(image_data)
            path.write_bytes(img_resp.content)
        else:
            path.write_bytes(base64.b64decode(image_data))

        logger.info("Generated AI cover: %s", path)
        return path

    except Exception as exc:
        logger.warning("AI cover generation failed: %s", exc)
        return None


def generate_cover(
    title: str,
    api_key: Optional[str] = None,
    api_base: str = "https://api.minimaxi.com",
    output_path: Optional[Path] = None,
) -> Path:
    """
    Generate cover image: tries AI API first, falls back to text-based.
    Always returns a valid Path.
    """
    if api_key and api_key.strip():
        result = generate_ai_cover(title, api_key, api_base, output_path)
        if result:
            return result

    return generate_text_cover(title, output_path)


# ── Helpers ──

def _safe_filename(title: str) -> str:
    """Sanitize title for use as a filename."""
    safe = "".join(c for c in title[:30] if c.isalnum() or c in " _-")
    return safe.strip() or "podcast"
