"""Cleanup tasks — periodic jobs for audio asset lifecycle management."""

import logging
import os
from datetime import datetime, timezone

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.audio_asset import AudioAsset

logger = logging.getLogger(__name__)

# Base directory for serving static files (where urls like /static/audio/... are rooted)
# Navigate from app/tasks/cleanup.py → app/ → backend/ → static/
STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "static"))


def _delete_file_ignore_errors(path: str) -> None:
    """Delete a file; log but do not raise on failure."""
    try:
        if os.path.isfile(path):
            os.remove(path)
            logger.debug("Deleted audio file: %s", path)
    except Exception as exc:
        logger.warning("Failed to delete audio file %s: %s", path, exc)


@celery_app.task(name="cleanup_expired_audio_assets")
def cleanup_expired_audio_assets() -> dict:
    """
    Delete AudioAsset records whose ``expires_at`` is in the past and remove
    their associated audio files from disk.

    Returns a summary dict with counts.
    """
    now = datetime.now(timezone.utc)
    db: Session = SessionLocal()
    deleted_records = 0
    deleted_files = 0
    errors = 0

    try:
        # Fetch expired assets
        expired = db.query(AudioAsset).filter(AudioAsset.expires_at <= now).all()
        logger.info("Found %d expired audio assets to clean up", len(expired))

        for asset in expired:
            # Resolve file path from asset.url
            # url is stored as e.g. "/static/audio/filename.wav"
            if asset.url:
                # Extract filename from URL and build absolute path
                filename = os.path.basename(asset.url)
                full_path = os.path.join(STATIC_DIR, "audio", filename)
                if os.path.isfile(full_path):
                    _delete_file_ignore_errors(full_path)
                    deleted_files += 1

            # Delete the database record
            try:
                db.delete(asset)
                deleted_records += 1
            except Exception as exc:
                logger.error("Failed to delete AudioAsset %s: %s", asset.id, exc)
                errors += 1

        db.commit()
        logger.info(
            "Audio cleanup complete: %d records deleted, %d files deleted, %d errors",
            deleted_records,
            deleted_files,
            errors,
        )
        return {
            "deleted_records": deleted_records,
            "deleted_files": deleted_files,
            "errors": errors,
        }

    except Exception as exc:
        logger.error("Audio cleanup task failed: %s", exc)
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(name="cleanup_orphaned_audio_files")
def cleanup_orphaned_audio_files() -> dict:
    """
    Scan the audio storage directory and delete files that are no longer
    referenced by any AudioAsset record.

    This handles edge-cases where a file exists on disk but the database
    record was already removed.
    """
    db: Session = SessionLocal()
    orphaned_files = 0

    try:
        from app.config import get_settings
        settings = get_settings()
        # Audio storage directory (same as in mock_tts.py)
        audio_dir = os.path.join(settings.BASE_DIR, "static", "audio")
        if not os.path.isdir(audio_dir):
            return {"orphaned_files": 0, "message": "Audio directory does not exist"}

        # Get all urls currently in the database
        assets = db.query(AudioAsset).all()
        valid_filenames = set()
        for asset in assets:
            if asset.url:
                filename = os.path.basename(asset.url)
                valid_filenames.add(filename)

        # Scan directory and delete orphans
        for filename in os.listdir(audio_dir):
            file_path = os.path.join(audio_dir, filename)
            if os.path.isfile(file_path) and filename not in valid_filenames:
                _delete_file_ignore_errors(file_path)
                orphaned_files += 1

        logger.info("Orphaned file cleanup complete: %d files deleted", orphaned_files)
        return {"orphaned_files": orphaned_files}

    except Exception as exc:
        logger.error("Orphaned file cleanup failed: %s", exc)
        raise
    finally:
        db.close()
