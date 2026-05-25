"""Synthesis task model – tracks TTS batch jobs."""

import uuid

from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class SynthesisTask(Base):
    """Tracks a TTS synthesis batch job for a podcast project."""

    __tablename__ = "synthesis_tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(
        String(36),
        ForeignKey("podcast_projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    type = Column(String(20), nullable=False)  # full / partial / resynthesize
    status = Column(String(20), default="pending")  # pending / running / completed / failed
    total_segments = Column(Integer, default=0)
    completed_segments = Column(Integer, default=0)
    estimated_credits = Column(Integer, nullable=True)
    actual_credits = Column(Integer, nullable=True)
    retry_count = Column(Integer, default=0)
    provider_used = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    project = relationship("PodcastProject", back_populates="synthesis_tasks")
    user = relationship("User", back_populates="synthesis_tasks")

    def __repr__(self) -> str:
        return (
            f"<SynthesisTask(id={self.id!r}, project_id={self.project_id!r}, "
            f"type={self.type!r}, status={self.status!r})>"
        )
