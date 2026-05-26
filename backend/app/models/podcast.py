"""Podcast models – projects, scripts, and role definitions."""

import uuid

from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    Numeric,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class PodcastProject(Base):
    """Top-level podcast project with status state machine."""

    __tablename__ = "podcast_projects"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    title = Column(String(200), nullable=False)
    mode = Column(String(10), nullable=False)  # solo / duo
    style = Column(String(20), default="professional")  # professional / casual / storytelling / news
    target_duration = Column(Integer, nullable=True)  # seconds
    status = Column(
        String(30),
        default="draft",
    )  # draft / outlining / scripting / ready_to_synthesize / synthesizing / completed / failed
    final_audio_asset_id = Column(
        String(36),
        ForeignKey("audio_assets.id", use_alter=True, ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="podcast_projects")
    script = relationship(
        "PodcastScript",
        back_populates="project",
        uselist=False,
        cascade="all, delete-orphan",
    )
    roles = relationship(
        "PodcastRole",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    audio_assets = relationship(
        "AudioAsset",
        back_populates="project",
        foreign_keys="AudioAsset.project_id",
        cascade="all, delete-orphan",
    )
    synthesis_tasks = relationship(
        "SynthesisTask",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    final_audio_asset = relationship(
        "AudioAsset",
        foreign_keys=[final_audio_asset_id],
        post_update=True,
    )

    def to_dict(self) -> dict:
        """Serialize to dict (safe for JSON)."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "mode": self.mode,
            "style": self.style,
            "target_duration": self.target_duration,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "final_audio_asset": self.final_audio_asset.to_dict() if self.final_audio_asset else None,
        }

    def __repr__(self) -> str:
        return (
            f"<PodcastProject(id={self.id!r}, title={self.title!r}, "
            f"status={self.status!r})>"
        )


class PodcastScript(Base):
    """Generated script content for a podcast project (one-to-one)."""

    __tablename__ = "podcast_scripts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(
        String(36),
        ForeignKey("podcast_projects.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    outline = Column(Text, nullable=True)
    script_content = Column(Text, nullable=True)
    status = Column(String(20), default="draft")  # draft / generated / edited
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    project = relationship("PodcastProject", back_populates="script")
    segments = relationship(
        "PodcastSegment",
        back_populates="script",
        cascade="all, delete-orphan",
        order_by="PodcastSegment.sort_order",
    )

    def __repr__(self) -> str:
        return (
            f"<PodcastScript(id={self.id!r}, project_id={self.project_id!r}, "
            f"status={self.status!r})>"
        )


class PodcastRole(Base):
    """Speaker role assigned to a podcast project."""

    __tablename__ = "podcast_roles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(
        String(36),
        ForeignKey("podcast_projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    role_key = Column(String(20), nullable=False)  # host / guest / narrator
    name = Column(String(50), nullable=False)
    persona = Column(Text, nullable=True)
    provider_id = Column(
        String(36),
        ForeignKey("voice_presets.id", ondelete="SET NULL"),
        nullable=True,
    )
    voice_id = Column(String(100), nullable=True)
    speed = Column(Numeric(3, 2), default=1.0)
    pitch = Column(Numeric(3, 2), default=0.0)
    volume = Column(Numeric(3, 2), default=0.0)
    color = Column(String(20), nullable=True)

    # Relationships
    project = relationship("PodcastProject", back_populates="roles")
    voice_preset = relationship("VoicePreset", back_populates="podcast_roles")
    segments = relationship(
        "PodcastSegment",
        back_populates="role",
        cascade="all, delete-orphan",
    )

    def to_dict(self) -> dict:
        """Serialize to dict (safe for JSON)."""
        return {
            "id": self.id,
            "project_id": self.project_id,
            "role_key": self.role_key,
            "name": self.name,
            "persona": self.persona,
            "voice_id": self.voice_id,
            "speed": float(self.speed) if self.speed is not None else 1.0,
            "pitch": float(self.pitch) if self.pitch is not None else 0.0,
            "volume": float(self.volume) if self.volume is not None else 1.0,
            "color": self.color,
        }

    def __repr__(self) -> str:
        return (
            f"<PodcastRole(id={self.id!r}, role_key={self.role_key!r}, "
            f"name={self.name!r})>"
        )
