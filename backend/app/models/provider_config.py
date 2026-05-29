"""Provider configuration model — persisted in DB, survives restarts."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Text, Boolean, DateTime
from sqlalchemy.orm import Session

from app.models.base import Base


class ProviderConfig(Base):
    """TTS Provider configuration stored in DB."""

    __tablename__ = "provider_config"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self) -> str:
        return f"<ProviderConfig(key={self.key!r})>"


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

_CONFIG_DEFAULTS: dict[str, str] = {
    "primary": "mimo",
    "fallback": "edge-tts",
    "minimax_api_key": "",
    "mimo_api_key": "",
    "mimo_api_base": "https://token-plan-cn.xiaomimimo.com/v1",
    "edge_tts_enabled": "true",
}


def load_provider_config(db: Session) -> dict[str, str]:
    """Load all provider config from DB, falling back to defaults."""
    rows = db.query(ProviderConfig).all()
    stored = {r.key: r.value for r in rows}

    # Auto-initialize missing defaults
    changed = False
    for k, v in _CONFIG_DEFAULTS.items():
        if k not in stored:
            db.add(ProviderConfig(key=k, value=str(v)))
            stored[k] = str(v)
            changed = True
    if changed:
        db.commit()

    return stored


def update_provider_config(db: Session, updates: dict[str, str]) -> dict[str, str]:
    """Upsert provider config values."""
    for key, value in updates.items():
        if key not in _CONFIG_DEFAULTS:
            continue
        row = db.query(ProviderConfig).filter(ProviderConfig.key == key).first()
        if row:
            row.value = str(value)
            row.updated_at = datetime.now(timezone.utc)
        else:
            db.add(ProviderConfig(key=key, value=str(value)))
    db.commit()
    return load_provider_config(db)
