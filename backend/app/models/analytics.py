"""Analytics models – event tracking and user behavior analytics."""

import uuid

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    Index,
)
from sqlalchemy.sql import func

from app.models.base import Base


class AnalyticsEvent(Base):
    """Analytics event log (user actions, system events)."""

    __tablename__ = "analytics_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        nullable=True,
        index=True,
    )  # Nullable for anonymous events
    event_type = Column(String(50), nullable=False, index=True)
    event_category = Column(String(50), nullable=True, index=True)  # user / system / error
    entity_type = Column(String(50), nullable=True, index=True)  # podcast / segment / task
    entity_id = Column(String(36), nullable=True, index=True)
    properties_json = Column(Text, nullable=True)  # JSON string for additional properties
    session_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now(), index=True)

    # Indexes for common queries
    __table_args__ = (
        Index("idx_analytics_user_event", "user_id", "event_type"),
        Index("idx_analytics_created", "created_at"),
    )

    def to_dict(self) -> dict:
        """Serialize to dict."""
        import json

        properties = {}
        if self.properties_json:
            try:
                properties = json.loads(self.properties_json)
            except Exception:
                pass

        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_type": self.event_type,
            "event_category": self.event_category,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "properties": properties,
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self) -> str:
        return (
            f"<AnalyticsEvent(id={self.id!r}, "
            f"event_type={self.event_type!r})>"
        )


class UserActivity(Base):
    """Daily user activity summary (for analytics dashboard)."""

    __tablename__ = "user_activities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        nullable=False,
        index=True,
    )
    activity_date = Column(DateTime(timezone=True), nullable=False, index=True)
    podcasts_created = Column(String(20), default="0")
    scripts_generated = Column(String(20), default="0")
    segments_synthesized = Column(String(20), default="0")
    credits_used = Column(String(20), default="0")
    total_duration_seconds = Column(String(20), default="0")
    created_at = Column(DateTime(timezone=True), default=func.now())

    __table_args__ = (
        Index("idx_activity_user_date", "user_id", "activity_date"),
    )

    def to_dict(self) -> dict:
        """Serialize to dict."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "activity_date": self.activity_date.isoformat() if self.activity_date else None,
            "podcasts_created": int(self.podcasts_created or "0"),
            "scripts_generated": int(self.scripts_generated or "0"),
            "segments_synthesized": int(self.segments_synthesized or "0"),
            "credits_used": int(self.credits_used or "0"),
            "total_duration_seconds": int(self.total_duration_seconds or "0"),
        }

    def __repr__(self) -> str:
        return (
            f"<UserActivity(id={self.id!r}, "
            f"user_id={self.user_id!r})>"
        )
