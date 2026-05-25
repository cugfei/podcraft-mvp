"""User model – core identity for authentication and ownership."""

import uuid

from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class User(Base):
    """Application user with email/phone login and role-based access."""

    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=True)
    phone = Column(String(20), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    role = Column(String(20), default="user")  # admin / user
    status = Column(String(20), default="active")  # active / disabled / deleted
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    credit_account = relationship(
        "CreditAccount",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    credit_transactions = relationship(
        "CreditTransaction",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    orders = relationship(
        "Order",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    podcast_projects = relationship(
        "PodcastProject",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    user_presets = relationship(
        "UserPreset",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    synthesis_tasks = relationship(
        "SynthesisTask",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id!r}, email={self.email!r})>"
