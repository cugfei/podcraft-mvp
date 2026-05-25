"""Audio asset model – generated TTS audio files."""

import uuid

from sqlalchemy import (
    Column,
    String,
    Integer,
    Numeric,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class AudioAsset(Base):
    """Stored audio file produced by TTS synthesis."""

    __tablename__ = "audio_assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(
        String(36),
        ForeignKey("podcast_projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    segment_id = Column(
        String(36),
        ForeignKey("podcast_segments.id", use_alter=True, ondelete="SET NULL"),
        nullable=True,
    )
    type = Column(String(20), nullable=False)  # segment / full
    format = Column(String(10), default="mp3")  # mp3 / wav
    duration_ms = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)
    loudness_lufs = Column(Numeric(5, 1), nullable=True)
    version = Column(Integer, default=1)
    url = Column(String(500), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())

    # Relationships
    project = relationship(
        "PodcastProject",
        back_populates="audio_assets",
        foreign_keys=[project_id],
    )
    # Independent FK navigation (not back_populated – separate FK from PodcastSegment.audio_asset_id)
    segment = relationship(
        "PodcastSegment",
        foreign_keys=[segment_id],
        post_update=True,
    )

    def __repr__(self) -> str:
        return (
            f"<AudioAsset(id={self.id!r}, type={self.type!r}, "
            f"format={self.format!r}, duration_ms={self.duration_ms})>"
        )
