"""
Multi-modal content parser — URL and PDF extraction.
Refactored from minimax_aipodcast/content_parser.py for PodCraft.
"""

import logging
import re
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from PyPDF2 import PdfReader

logger = logging.getLogger(__name__)

# ── Constants ──
MAX_CONTENT_LENGTH = 15000  # max chars per source
URL_TIMEOUT = 30            # seconds
PDF_TIMEOUT = 30            # seconds

# Browser-like headers to avoid 403 blocks
_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Referer": "https://www.google.com/",
}

# Tags to strip during HTML cleaning
_STRIP_TAGS = {"script", "style", "nav", "footer", "header", "aside", "noscript", "iframe", "form"}


# ── Public API ──

def parse_url(url: str, max_length: int = MAX_CONTENT_LENGTH) -> dict:
    """
    Fetch and parse a web page, extracting clean text content.

    Returns:
        {"success": bool, "content": str, "title": str|None, "source": str, "logs": [str]}
    """
    logs: list = []
    parsed = urlparse(url)
    if not parsed.scheme:
        url = f"https://{url}"
        logs.append(f"Auto-added https:// scheme → {url}")

    try:
        with httpx.Client(timeout=URL_TIMEOUT, follow_redirects=True, headers=_BROWSER_HEADERS) as client:
            resp = client.get(url)
    except httpx.RequestError as exc:
        logger.warning("URL fetch failed for %s: %s", url, exc)
        return {
            "success": False,
            "content": "",
            "title": None,
            "source": url,
            "logs": [f"网络请求失败: {exc}"],
        }

    if resp.status_code == 403:
        logs.append("网站拒绝访问 (403)，建议手动复制文本内容")
    elif resp.status_code >= 400:
        logs.append(f"HTTP {resp.status_code}")

    if not resp.text:
        return {"success": False, "content": "", "title": None, "source": url, "logs": logs}

    # Parse HTML
    soup = BeautifulSoup(resp.text, "lxml")

    # Extract title
    title = None
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    # Remove unwanted tags
    for tag in _STRIP_TAGS:
        for el in soup.find_all(tag):
            el.decompose()

    # Extract text from body or whole document
    body = soup.body or soup
    text = body.get_text(separator="\n", strip=True)

    # Collapse whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)

    if len(text) > max_length:
        text = text[:max_length] + "\n\n[... 内容已截断，原文过长 ...]"
        logs.append(f"内容过长，已截断至 {max_length} 字符")

    char_count = len(text)
    logs.append(f"提取 {char_count} 字符")
    logger.info("Parsed URL %s → %d chars", url, char_count)

    return {"success": True, "content": text, "title": title, "source": url, "logs": logs}


def parse_pdf(file_path: str, max_length: int = MAX_CONTENT_LENGTH) -> dict:
    """
    Extract text from a PDF file.

    Returns:
        {"success": bool, "content": str, "title": str|None, "pages": int, "logs": [str]}
    """
    logs: list = []
    path = Path(file_path)
    if not path.exists():
        return {"success": False, "content": "", "title": None, "pages": 0, "logs": ["文件不存在"]}

    file_size_mb = path.stat().st_size / (1024 * 1024)
    if file_size_mb > 50:
        return {"success": False, "content": "", "title": None, "pages": 0, "logs": [f"文件过大 ({file_size_mb:.1f} MB)，限制 50 MB"]}

    try:
        reader = PdfReader(str(path))
    except Exception as exc:
        logger.warning("PDF open failed: %s", exc)
        return {"success": False, "content": "", "title": None, "pages": 0, "logs": [f"PDF 解析失败: {exc}"]}

    pages = len(reader.pages)
    logs.append(f"共 {pages} 页")

    texts: list = []
    total_chars = 0
    cutoff = False

    for i, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        texts.append(page_text)
        total_chars += len(page_text)
        if total_chars > max_length:
            cutoff = True
            break

    content = "\n\n".join(texts)
    if cutoff:
        content = content[:max_length] + "\n\n[... 内容已截断，原文过长 ...]"
        logs.append(f"内容过长，已截断至 {max_length} 字符")
    elif not content.strip():
        # Might be a scanned/image-based PDF
        logs.append("PDF 无可提取文本（可能是扫描版），建议转换为文本 PDF 后重试")
        return {
            "success": False,
            "content": "",
            "title": path.stem,
            "pages": pages,
            "logs": logs,
        }

    # Try to extract title from first non-empty line
    title = None
    for line in content.split("\n"):
        stripped = line.strip()
        if stripped and len(stripped) > 3:
            title = stripped[:100]
            break

    logger.info("Parsed PDF %s → %d chars (%d pages)", file_path, len(content), pages)
    return {"success": True, "content": content, "title": title, "pages": pages, "logs": logs}


def merge_contents(*sources: dict) -> dict:
    """
    Merge multiple parsed content sources into a single text block.

    Each source is a dict like: {"content": str, "source": str, "title": str|None}
    Returns: {"content": str, "sources": list}
    """
    parts: list = []
    source_list: list = []

    for i, src in enumerate(sources):
        content = (src.get("content") or "").strip()
        if not content:
            continue

        label = src.get("title") or src.get("source") or f"来源 {i+1}"
        parts.append(f"【{label}】\n{content}")
        source_list.append({
            "title": src.get("title"),
            "source": src.get("source"),
            "char_count": len(content),
        })

    merged = "\n\n" + "=" * 40 + "\n\n".join(parts)
    return {"content": merged, "sources": source_list}
