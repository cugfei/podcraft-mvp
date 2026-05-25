"""Storage service package."""

from app.services.storage.local import storage, LocalStorage

__all__ = ["storage", "LocalStorage"]
