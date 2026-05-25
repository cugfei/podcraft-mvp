"""Voice models – preset voices and user custom voices."""

import uuid

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class VoicePreset(Base):
    """System-defined voice preset available to all users."""

    __tablename__ = "voice_presets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    gender = Column(String(10), nullable=True)  # male / female
    style = Column(String(50), nullable=True)
    scenario = Column(String(100), nullable=True)
    provider_id = Column(String(36), nullable=True)  # external TTS provider id
    provider_voice_id = Column(String(100), nullable=True)  # provider-specific voice id
    language = Column(String(50), default="zh-CN")  # V3.0
    voice_params = Column(JSON, nullable=True)  # V3.0: {speed, pitch, volume, emotion}
    is_cloned = Column(Boolean, default=False)  # V3.0
    clone_source = Column(String(500), nullable=True)  # V3.0
    usage_count = Column(Integer, default=0)  # V3.0
    preview_audio_url = Column(String(500), nullable=True)
    status = Column(String(20), default="active")  # active / disabled
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    podcast_roles = relationship(
        "PodcastRole",
        back_populates="voice_preset",
    )

    def __repr__(self) -> str:
        return f"<VoicePreset(id={self.id!r}, name={self.name!r})>"


class UserPreset(Base):
    """User-created custom voice preset (V3.0 P2)."""

    __tablename__ = "user_presets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(100), nullable=False)
    provider_id = Column(String(36), nullable=True)  # external TTS provider id
    provider_voice_id = Column(String(100), nullable=True)
    language = Column(String(50), default="zh-CN")
    voice_params = Column(JSON, nullable=True)
    is_public = Column(Boolean, default=False)
    usage_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="user_presets")

    def __repr__(self) -> str:
        return f"<UserPreset(id={self.id!r}, name={self.name!r}, user_id={self.user_id!r})>"
