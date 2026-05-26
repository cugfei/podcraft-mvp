"""Analytics API — event tracking and analytics queries."""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.analytics import AnalyticsEvent, UserActivity
from app.models.user import User
from app.api.v1.auth import get_current_user, get_current_admin
from app.services.analytics_service import (
    record_event,
    get_user_events,
    get_event_stats,
    update_user_activity,
)
from app.utils.response import success

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


# --- Request/Response Models ---


class TrackEventRequest(BaseModel):
    """Request body for tracking an event."""

    event_type: str
    event_category: str = "user"
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    properties: Optional[dict] = None


class EventResponse(BaseModel):
    """Response for event tracking."""

    code: int = 0
    data: Optional[dict] = None
    message: str = "ok"


# --- User Endpoints ---


@router.post("/track")
async def track_event(
    body: TrackEventRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventResponse:
    """Track an analytics event (authenticated users)."""
    event = record_event(
        db=db,
        event_type=body.event_type,
        user_id=str(current_user.id),
        event_category=body.event_category,
        entity_type=body.entity_type,
        entity_id=body.entity_id,
        properties=body.properties,
    )

    return EventResponse(
        data={"event_id": event.id},
        message="Event tracked successfully",
    )


@router.get("/my-events")
async def get_my_events(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventResponse:
    """Get current user's analytics events."""
    events = get_user_events(
        db=db,
        user_id=str(current_user.id),
        event_type=event_type,
        limit=limit,
    )

    return EventResponse(
        data={
            "events": [e.to_dict() for e in events],
            "total": len(events),
        },
        message="ok",
    )


@router.get("/my-activity")
async def get_my_activity(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventResponse:
    """Get current user's activity summary (last N days)."""
    from datetime import timedelta
    from sqlalchemy import func as sql_func

    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    activities = (
        db.query(UserActivity)
        .filter(
            UserActivity.user_id == str(current_user.id),
            UserActivity.activity_date >= start_date,
        )
        .order_by(UserActivity.activity_date.desc())
        .all()
    )

    # Summary
    summary = {
        "total_podcasts": sum(int(a.podcasts_created or "0") for a in activities),
        "total_scripts": sum(int(a.scripts_generated or "0") for a in activities),
        "total_segments": sum(int(a.segments_synthesized or "0") for a in activities),
        "total_credits": sum(int(a.credits_used or "0") for a in activities),
        "total_duration": sum(int(a.total_duration_seconds or "0") for a in activities),
    }

    return EventResponse(
        data={
            "activities": [a.to_dict() for a in activities],
            "summary": summary,
            "days": days,
        },
        message="ok",
    )


# --- Admin Endpoints ---


@router.get("/admin/events")
async def admin_get_events(
    user_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> EventResponse:
    """Admin: Get all analytics events with filters."""
    query = db.query(AnalyticsEvent)

    if user_id:
        query = query.filter(AnalyticsEvent.user_id == user_id)
    if event_type:
        query = query.filter(AnalyticsEvent.event_type == event_type)
    if start_date:
        query = query.filter(AnalyticsEvent.created_at >= start_date)
    if end_date:
        query = query.filter(AnalyticsEvent.created_at <= end_date)

    events = query.order_by(AnalyticsEvent.created_at.desc()).limit(limit).all()

    return EventResponse(
        data={
            "events": [e.to_dict() for e in events],
            "total": len(events),
        },
        message="ok",
    )


@router.get("/admin/stats")
async def admin_get_stats(
    event_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> EventResponse:
    """Admin: Get event statistics (count by day)."""
    stats = get_event_stats(
        db=db,
        event_type=event_type,
        start_date=start_date,
        end_date=end_date,
    )

    return EventResponse(
        data={
            "stats": stats,
            "total_days": len(stats),
        },
        message="ok",
    )


@router.get("/admin/dashboard")
async def admin_get_dashboard(
    db: Session = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> EventResponse:
    """Admin: Get analytics dashboard summary."""
    from sqlalchemy import func as sql_func

    # Total users
    total_users = db.query(sql_func.count(User.id)).scalar()

    # Total podcasts
    from app.models.podcast import PodcastProject

    total_podcasts = db.query(sql_func.count(PodcastProject.id)).scalar()

    # Total events (last 30 days)
    from datetime import timedelta

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    total_events = (
        db.query(sql_func.count(AnalyticsEvent.id))
        .filter(AnalyticsEvent.created_at >= thirty_days_ago)
        .scalar()
    )

    # Events by type (last 30 days)
    events_by_type = (
        db.query(
            AnalyticsEvent.event_type,
            sql_func.count().label("count"),
        )
        .filter(AnalyticsEvent.created_at >= thirty_days_ago)
        .group_by(AnalyticsEvent.event_type)
        .all()
    )

    return EventResponse(
        data={
            "total_users": total_users,
            "total_podcasts": total_podcasts,
            "total_events_30d": total_events,
            "events_by_type": {e.event_type: e.count for e in events_by_type},
        },
        message="ok",
    )
