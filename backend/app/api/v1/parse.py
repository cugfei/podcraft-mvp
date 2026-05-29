"""Content parsing API — URL & PDF extraction."""

import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.services.content_parser import parse_url, parse_pdf, merge_contents

router = APIRouter(prefix="/parse", tags=["parse"])

# ── Upload directory ──
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads" / "pdf"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ── Schemas ──
class ParseUrlRequest(BaseModel):
    url: str
    max_length: int = 15000


class ParseMergeRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None
    max_length: int = 15000


# ── Routes ──

@router.post("/url")
def parse_url_endpoint(
    body: ParseUrlRequest,
    current_user: User = Depends(get_current_user),
):
    """Parse a web page URL and return extracted text content."""
    if not body.url.strip():
        raise HTTPException(status_code=400, detail="URL is required")

    result = parse_url(body.url.strip(), max_length=body.max_length)
    return {"code": 0, "data": result, "message": "ok"}


@router.post("/pdf")
async def parse_pdf_endpoint(
    file: UploadFile = File(...),
    max_length: int = Form(15000),
    current_user: User = Depends(get_current_user),
):
    """Upload and parse a PDF file, returning extracted text."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in (".pdf",):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    # Save to disk
    safe_name = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / safe_name
    content = await file.read()
    file_path.write_bytes(content)

    try:
        result = parse_pdf(str(file_path), max_length=max_length)
    finally:
        # Clean up temp file
        try:
            os.unlink(file_path)
        except OSError:
            pass

    return {"code": 0, "data": result, "message": "ok"}


@router.post("/merge")
def parse_merge_endpoint(
    body: ParseMergeRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Parse URL + provided text, merge into one content block.
    Useful for create page: user enters a URL and/or additional notes.
    """
    sources: list = []

    if body.url and body.url.strip():
        url_result = parse_url(body.url.strip(), max_length=body.max_length)
        if url_result["success"]:
            sources.append(url_result)

    if body.text and body.text.strip():
        sources.append({
            "content": body.text.strip(),
            "title": "用户输入",
            "source": "manual",
        })

    if not sources:
        raise HTTPException(status_code=400, detail="No content provided (url or text)")

    merged = merge_contents(*sources)
    return {"code": 0, "data": merged, "message": "ok"}


# ── Cover generation ──

class GenerateCoverRequest(BaseModel):
    title: str
    use_ai: bool = False


@router.post("/cover")
def generate_cover_endpoint(
    body: GenerateCoverRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Generate a podcast cover image. Tries AI API if use_ai=True, falls back to text-based."""
    from app.models.provider_config import load_provider_config
    from app.services.cover_generator import generate_cover, generate_text_cover, COVER_DIR

    config = load_provider_config(db)

    if body.use_ai:
        api_key = config.get("minimax_api_key", "") or ""
        api_base = config.get("minimax_api_base", "") or "https://api.minimaxi.com"
        path = generate_cover(body.title, api_key=api_key, api_base=api_base)
    else:
        path = generate_text_cover(body.title)

    url = f"/static/covers/{path.name}"
    return {"code": 0, "data": {"url": url, "filename": path.name}, "message": "ok"}


# ── BGM ──

@router.get("/bgm")
def list_bgm():
    """Return available BGM options."""
    from app.services.bgm_generator import ensure_bgm_files
    files = ensure_bgm_files()
    return {
        "code": 0,
        "data": {
            "bgm_intro": "/static/bgm/bgm01.wav",
            "bgm_outro": "/static/bgm/bgm02.wav",
            "available": list(files.keys()),
        },
        "message": "ok",
    }
