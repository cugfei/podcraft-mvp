"""LLM service – call DeepSeek V4 Flash (OpenAI compatible API)."""

import json
import logging
from typing import Optional

from openai import OpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)

# DeepSeek API configuration
DEEPSEEK_API_KEY = "sk-76ec968fddb148fbb66d5e8be471f922"
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"  # Fast model (V3)


def get_llm_client() -> OpenAI:
    """Create and return an OpenAI client configured for DeepSeek."""
    settings = get_settings()
    api_key = getattr(settings, "DEEPSEEK_API_KEY", None) or DEEPSEEK_API_KEY
    return OpenAI(
        api_key=api_key,
        base_url=DEEPSEEK_BASE_URL,
    )


def generate_outline(
    title: str,
    style: str,
    target_duration: Optional[int] = None,
    mode: str = "solo",
    prompt: Optional[str] = None,
) -> str:
    """Generate podcast outline using LLM.

    Args:
        title: Podcast title / topic.
        style: Professional / casual / storytelling / news.
        target_duration: Target duration in seconds (optional).
        mode: solo / duo.
        prompt: Additional user prompt (optional).

    Returns:
        Generated outline as markdown string.
    """
    system_prompt = """You are a professional podcast script writer.
Generate a detailed podcast outline in markdown format.

The outline should include:
1. **Introduction** - Hook and introduction of the topic
2. **Main content** - 3-5 key points with sub-points
3. **Conclusion** - Summary and call-to-action

Format requirements:
- Use markdown headings (## for sections, ### for sub-sections)
- Keep each section concise but informative
- Include estimated time for each section
- For duo mode, mark speakers as [Host] and [Guest]

Output ONLY the outline in markdown, no additional commentary."""

    user_prompt = f"""Podcast Title/Topic: {title}
Style: {style}
Mode: {mode}
"""
    if target_duration:
        user_prompt += f"Target Duration: {target_duration} seconds\n"
    if prompt:
        user_prompt += f"\nAdditional Requirements: {prompt}\n"

    user_prompt += "\nPlease generate the podcast outline in markdown format."

    try:
        client = get_llm_client()
        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        outline = response.choices[0].message.content
        logger.info("Generated outline for topic: %s", title)
        return outline or ""
    except Exception as e:
        logger.error("LLM outline generation failed: %s", e)
        raise


def generate_script(
    title: str,
    outline: str,
    style: str,
    mode: str = "solo",
    roles: Optional[list] = None,
) -> str:
    """Generate full podcast script from outline using LLM.

    Args:
        title: Podcast title.
        outline: Generated outline (markdown).
        style: Professional / casual / storytelling / news.
        mode: solo / duo.
        roles: List of role definitions (for duo mode).

    Returns:
        Generated script as markdown string with segment markers.
    """
    roles_desc = ""
    if roles and mode == "duo":
        roles_desc = "Speaker roles:\n"
        for role in roles:
            roles_desc += f"- {role.get('role_key', 'speaker')}: {role.get('name', 'Speaker')} - {role.get('persona', '')}\n"

    system_prompt = """You are a professional podcast script writer.
Generate a full podcast script based on the provided outline.

**CRITICAL FORMAT REQUIREMENTS:**
1. Start each segment with: [SEGMENT] Segment Title
2. For duo mode, clearly mark speakers: [Host]: text / [Guest]: text
3. For solo mode, just write the narration text
4. Include emotion hints in parentheses: (happy) (calm) (excited) etc.
5. Add pause hints: [PAUSE 500] (500ms pause)
6. Keep each segment to 30-60 seconds of spoken content
7. Use natural, conversational language

Output the script in markdown format with clear segment markers.
Make sure the script flows naturally and covers all points in the outline."""

    user_prompt = f"""Podcast Title: {title}
Style: {style}
Mode: {mode}

{roles_desc}
Outline:
{outline}

Please generate the full podcast script with segment markers."""

    try:
        client = get_llm_client()
        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.8,
            max_tokens=4000,
        )
        script = response.choices[0].message.content
        logger.info("Generated script for podcast: %s", title)
        return script or ""
    except Exception as e:
        logger.error("LLM script generation failed: %s", e)
        raise


def parse_script_to_segments(script: str, roles: list) -> list[dict]:
    """Parse script text into segments.

    Args:
        script: Full script text with segment markers.
        roles: List of role definitions.

    Returns:
        List of segment dicts with keys: role_key, text, emotion, pause_after_ms
    """
    segments = []
    current_segment = None
    role_map = {r.get("role_key"): r for r in roles} if roles else {}

    lines = script.split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Check for segment marker
        if line.startswith("[SEGMENT]"):
            if current_segment and current_segment.get("text"):
                segments.append(current_segment)
            current_segment = {
                "role_key": "host",  # Default
                "text": "",
                "emotion": "neutral",
                "pause_after_ms": 700,
            }
            continue

        # Check for speaker markers (duo mode)
        if line.startswith("[Host]:"):
            if current_segment and current_segment.get("text"):
                segments.append(current_segment)
            current_segment = {
                "role_key": "host",
                "text": line[7:].strip(),
                "emotion": "neutral",
                "pause_after_ms": 700,
            }
            continue
        elif line.startswith("[Guest]:"):
            if current_segment and current_segment.get("text"):
                segments.append(current_segment)
            current_segment = {
                "role_key": "guest",
                "text": line[8:].strip(),
                "emotion": "neutral",
                "pause_after_ms": 700,
            }
            continue

        # Append to current segment text
        if current_segment is None:
            current_segment = {
                "role_key": "host",
                "text": line,
                "emotion": "neutral",
                "pause_after_ms": 700,
            }
        else:
            current_segment["text"] += " " + line

        # Extract emotion hint
        for emotion in ["happy", "sad", "angry", "calm", "excited", "neutral"]:
            if f"({emotion})" in line.lower():
                current_segment["emotion"] = emotion
                break

        # Extract pause hint
        import re
        pause_match = re.search(r"\[PAUSE\s+(\d+)\]", line)
        if pause_match:
            current_segment["pause_after_ms"] = int(pause_match.group(1))

    # Don't forget the last segment
    if current_segment and current_segment.get("text"):
        segments.append(current_segment)

    return segments
