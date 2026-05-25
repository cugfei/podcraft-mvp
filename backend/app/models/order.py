"""Order model – payment records for credit purchases."""

import uuid

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.models.base import Base


class Order(Base):
    """Payment order for purchasing credit packs."""

    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    plan_id = Column(String(50), nullable=True)
    amount = Column(Integer, nullable=False)  # unit: cents (分)
    credits_granted = Column(Integer, nullable=False)
    payment_method = Column(String(20), nullable=True)  # alipay / wechat / card_key / stripe
    payment_status = Column(String(20), default="pending")  # pending / paid / failed / refunded
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())

    # Relationships
    user = relationship("User", back_populates="orders")

    def __repr__(self) -> str:
        return (
            f"<Order(id={self.id!r}, user_id={self.user_id!r}, "
            f"amount={self.amount}, status={self.payment_status!r})>"
        )
