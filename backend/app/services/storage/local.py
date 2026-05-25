"""Local filesystem storage backend (dev/MVP)."""

import logging
import os
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)

_DEFAULT_BASE = os.environ.get("STORAGE_PATH", "storage")


class LocalStorage:
    """Store audio assets on the local filesystem.

    Directory layout::

        <base>/
        └── audio/
            └── <uuid>.mp3
    """

    def __init__(self, base_path: str = _DEFAULT_BASE) -> None:
        self._base = Path(base_path)
        self._audio_dir = self._base / "audio"
        self._audio_dir.mkdir(parents=True, exist_ok=True)

    async def upload(self, key: str, data: bytes) -> str:
        """Persist *data* under *key* and return a relative URL."""
        target = self._audio_dir / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        url = f"/audio/{key}"
        logger.debug("Stored %d bytes → %s", len(data), target)
        return url

    async def download(self, key: str) -> bytes:
        target = self._audio_dir / key
        if not target.exists():
            raise FileNotFoundError(key)
        return target.read_bytes()

    async def delete(self, key: str) -> None:
        target = self._audio_dir / key
        if target.exists():
            target.unlink()
            logger.debug("Deleted %s", target)

    async def exists(self, key: str) -> bool:
        return (self._audio_dir / key).exists()

    def resolve_path(self, key: str) -> Path:
        """Return the absolute filesystem path for *key*."""
        return self._audio_dir / key

    def path_for(self, relative_url: str) -> Path:
        """Convert a ``/audio/<key>`` URL back to an absolute path."""
        key = relative_url.lstrip("/")
        if key.startswith("audio/"):
            key = key[len("audio/"):]
        return self._audio_dir / key


# Module-level singleton
storage = LocalStorage()
