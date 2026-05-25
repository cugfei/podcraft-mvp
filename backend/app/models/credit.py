"""Credit models – account balances and transaction history."""

import uuid

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class CreditAccount(Base):
    """Per-user credit balance with optimistic-locking version field."""

    __tablename__ = "credit_accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    balance = Column(Integer, default=0)
    frozen = Column(Integer, default=0)
    total_recharged = Column(Integer, default=0)
    total_consumed = Column(Integer, default=0)
    version = Column(Integer, default=0)  # optimistic lock
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="credit_account")
    transactions = relationship(
        "CreditTransaction",
        back_populates="account",
        cascade="all, delete-orphan",
    )

    @property
    def available(self) -> int:
        """Credits available for spending (balance minus frozen)."""
        return self.balance - self.frozen

    def __repr__(self) -> str:
        return (
            f"<CreditAccount(id={self.id!r}, user_id={self.user_id!r}, "
            f"balance={self.balance})>"
        )


class CreditTransaction(Base):
    """Immutable ledger entry for every credit change."""

    __tablename__ = "credit_transactions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    account_id = Column(
        String(36),
        ForeignKey("credit_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )
    type = Column(String(20), nullable=False)  # grant / recharge / freeze / deduct / refund / adjust
    amount = Column(Integer, nullable=False)  # positive = credit, negative = debit
    balance_after = Column(Integer, nullable=False)
    reference_type = Column(String(50), nullable=True)
    reference_id = Column(String(36), nullable=True)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())

    # Relationships
    user = relationship("User", back_populates="credit_transactions")
    account = relationship("CreditAccount", back_populates="transactions")

    def __repr__(self) -> str:
        return (
            f"<CreditTransaction(id={self.id!r}, type={self.type!r}, "
            f"amount={self.amount})>"
        )
