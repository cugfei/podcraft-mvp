"""Analytics service – record events and generate analytics."""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from app.models.analytics import AnalyticsEvent, UserActivity

logger = logging.getLogger(__name__)

# Event type constants
EVENT_PODCAST_CREATE = "podcast.create"
EVENT_PODCAST_UPDATE = "podcast.update"
EVENT_PODCAST_DELETE = "podcast.delete"
EVENT_OUTLINE_GENERATE = "outline.generate"
EVENT_SCRIPT_GENERATE = "script.generate"
EVENT_SEGMENT_CREATE = "segment.create"
EVENT_SEGMENT_UPDATE = "segment.update"
EVENT_SYNTHESIS_START = "synthesis.start"
EVENT_SYNTHESIS_COMPLETE = "synthesis.complete"
EVENT_SYNTHESIS_FAILED = "synthesis.failed"
EVENT_VOICE_PREVIEW = "voice.preview"
EVENT_USER_LOGIN = "user.login"
EVENT_USER_REGISTER = "user.register"
EVENT_CREDIT_CONSUME = "credit.consume"


def record_event(
    db: Session,
    event_type: str,
    user_id: Optional[str] = None,
    event_category: str = "user",
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    properties: Optional[Dict[str, Any]] = None,
    session_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AnalyticsEvent:
    """Record an analytics event.

    Args:
        db: Database session.
        event_type: Event type constant.
        user_id: User ID (optional for anonymous events).
        event_category: "user" / "system" / "error".
        entity_type: Type of entity (podcast / segment / task).
        entity_id: ID of the entity.
        properties: Additional properties (dict, will be JSON-serialized).
        session_id: Session ID for tracking user sessions.
        ip_address: User IP address.
        user_agent: User agent string.

    Returns:
        Created AnalyticsEvent instance.
    """
    properties_json = json.dumps(properties, ensure_ascii=False) if properties else None

    event = AnalyticsEvent(
        id=str(uuid.uuid4()),
        user_id=user_id,
        event_type=event_type,
        event_category=event_category,
        entity_type=entity_type,
        entity_id=entity_id,
        properties_json=properties_json,
        session_id=session_id,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=datetime.now(timezone.utc),
    )
    db.add(event)
    db.commit()

    logger.debug("Recorded event: %s for user %s", event_type, user_id)
    return event


def get_user_events(
    db: Session,
    user_id: str,
    event_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
) -> list[AnalyticsEvent]:
    """Get events for a specific user."""
    query = db.query(AnalyticsEvent).filter(AnalyticsEvent.user_id == user_id)

    if event_type:
        query = query.filter(AnalyticsEvent.event_type == event_type)
    if start_date:
        query = query.filter(AnalyticsEvent.created_at >= start_date)
    if end_date:
        query = query.filter(AnalyticsEvent.created_at <= end_date)

    return query.order_by(AnalyticsEvent.created_at.desc()).limit(limit).all()


def get_event_stats(
    db: Session,
    event_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> dict:
    """Get event statistics (count by day)."""
    from sqlalchemy import func as sql_func

    query = db.query(
        sql_func.date(AnalyticsEvent.created_at).label("date"),
        sql_func.count().label("count"),
    )

    if event_type:
        query = query.filter(AnalyticsEvent.event_type == event_type)
    if start_date:
        query = query.filter(AnalyticsEvent.created_at >= start_date)
    if end_date:
        query = query.filter(AnalyticsEvent.created_at <= end_date)

    query = query.group_by("date").order_by("date")

    return {str(row.date): row.count for row in query.all()}


def update_user_activity(
    db: Session,
    user_id: str,
    activity_date: Optional[datetime] = None,
    podcasts_created: int = 0,
    scripts_generated: int = 0,
    segments_synthesized: int = 0,
    credits_used: int = 0,
    duration_seconds: int = 0,
) -> UserActivity:
    """Update or create daily user activity summary."""
    if activity_date is None:
        activity_date = datetime.now(timezone.utc).date()

    activity = (
        db.query(UserActivity)
        .filter(
            UserActivity.user_id == user_id,
            sql_func.date(UserActivity.activity_date) == activity_date,
        )
        .first()
    )

    if not activity:
        activity = UserActivity(
            id=str(uuid.uuid4()),
            user_id=user_id,
            activity_date=activity_date,
        )
        db.add(activity)

    # Update counters
    activity.podcasts_created = str(int(activity.podcasts_created or "0") + podcasts_created)
    activity.scripts_generated = str(int(activity.scripts_generated or "0") + scripts_generated)
    activity.segments_synthesized = str(int(activity.segments_synthesized or "0") + segments_synthesized)
    activity.credits_used = str(int(activity.credits_used or "0") + credits_used)
    activity.total_duration_seconds = str(int(activity.total_duration_seconds or "0") + duration_seconds)

    db.commit()
    return activity
