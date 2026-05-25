"""Podcast segment model – individual spoken lines in a script."""

import uuid

from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class PodcastSegment(Base):
    """A single spoken segment (line) within a podcast script."""

    __tablename__ = "podcast_segments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    script_id = Column(
        String(36),
        ForeignKey("podcast_scripts.id", ondelete="CASCADE"),
        nullable=False,
    )
    role_id = Column(
        String(36),
        ForeignKey("podcast_roles.id", ondelete="CASCADE"),
        nullable=False,
    )
    sort_order = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    source_text_hash = Column(String(64), nullable=True)
    char_count = Column(Integer, nullable=True)
    emotion = Column(String(50), nullable=True)  # V3.0: happy / sad / angry / calm / excited
    pause_after_ms = Column(Integer, default=700)
    audio_asset_id = Column(
        String(36),
        ForeignKey("audio_assets.id", use_alter=True, ondelete="SET NULL"),
        nullable=True,
    )
    status = Column(String(20), default="draft")  # draft / queued / synthesizing / completed / failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    script = relationship("PodcastScript", back_populates="segments")
    role = relationship("PodcastRole", back_populates="segments")
    # Independent FK navigation (not back_populated – separate FK from AudioAsset.segment_id)
    audio_asset = relationship(
        "AudioAsset",
        foreign_keys=[audio_asset_id],
        post_update=True,
    )

    def __repr__(self) -> str:
        return (
            f"<PodcastSegment(id={self.id!r}, sort_order={self.sort_order}, "
            f"status={self.status!r})>"
        )
