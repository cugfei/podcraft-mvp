"""Celery application configuration.

Start a worker with::

    celery -A app.celery_app worker --loglevel=info -P solo
"""

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "podcraft",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_default_retry_delay=10,       # first retry after 10s
    task_retry_backoff=True,           # exponential backoff
    task_retry_backoff_max=90,         # max 90s between retries
    task_retry_max_retries=3,          # max 3 retries total
    task_soft_time_limit=600,          # 10 min soft timeout
    task_time_limit=900,               # 15 min hard timeout
    # ------------------------------------------------------------------
    # Beat schedule — periodic cleanup tasks (T-5.6)
    # ------------------------------------------------------------------
    beat_schedule={
        "cleanup-expired-audio-assets": {
            "task": "cleanup_expired_audio_assets",
            "schedule": 86400.0,          # run every 24 hours
            "options": {"queue": "cleanup"},
        },
        "cleanup-orphaned-audio-files": {
            "task": "cleanup_orphaned_audio_files",
            "schedule": 86400.0,          # run every 24 hours
            "options": {"queue": "cleanup"},
        },
    },
)

# Autodiscover tasks in the tasks package
celery_app.autodiscover_tasks(["app.tasks"])
