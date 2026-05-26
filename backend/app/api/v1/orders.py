"""Order & plan API – POST /api/orders, GET /api/orders, card-key recharge."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_session
from app.models.credit import CreditAccount, CreditTransaction
from app.models.order import Order
from app.models.user import User
from app.services.credit_service import grant, get_balance
from app.utils.response import success, error
from app.api.v1.auth import get_current_user


router = APIRouter(tags=["orders"])


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class CardKeyRecharge(BaseModel):
    """Request body for card-key recharge."""

    card_key: str = Field(..., min_length=8, max_length=64, description="Recharge card key")


class OrderCreate(BaseModel):
    """Request body for creating an order."""

    plan_id: str = Field(..., description="Plan ID (e.g., 'starter', 'pro', 'premium')")
    payment_method: str = Field(default="card_key", description="Payment method: card_key / alipay / wechat")


# ---------------------------------------------------------------------------
# Plans (MVP – hard-coded, can be moved to DB later)
# ---------------------------------------------------------------------------

_PLANS: list[dict] = [
    {
        "id": "trial",
        "name": "试用套餐",
        "credits": 100,
        "price_cents": 0,
        "description": "新用户试用",
    },
    {
        "id": "starter",
        "name": "入门套餐",
        "credits": 1000,
        "price_cents": 9900,
        "description": "适合轻度使用",
    },
    {
        "id": "pro",
        "name": "专业套餐",
        "credits": 5000,
        "price_cents": 39900,
        "description": "适合日常创作",
    },
    {
        "id": "premium",
        "name": "高级套餐",
        "credits": 20000,
        "price_cents": 149900,
        "description": "适合专业用户",
    },
    {
        "id": "enterprise",
        "name": "企业套餐",
        "credits": 100000,
        "price_cents": 699900,
        "description": "适合团队使用",
    },
]


# ---------------------------------------------------------------------------
# Helper – validate card key (MVP: simple hard-coded keys)
# ---------------------------------------------------------------------------

# MVP: hard-coded card keys (in production, these should be in a database)
_VALID_CARD_KEYS: dict[str, int] = {
    "PODCRAFT-DEMO-0001": 500,
    "PODCRAFT-DEMO-0002": 1000,
    "PODCRAFT-DEMO-0003": 5000,
}


def _verify_card_key(card_key: str) -> Optional[int]:
    """Return credits granted by *card_key*, or ``None`` if invalid."""
    return _VALID_CARD_KEYS.get(card_key.strip().upper())


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/plans", response_model=dict)
def get_plans() -> dict:
    """Return available credit plans (MVP: hard-coded)."""
    return success({"items": _PLANS})


@router.post("/create", response_model=dict)
def create_order(
    data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """Create a new order (MVP: card_key only, others placeholder)."""
    plan = next((p for p in _PLANS if p["id"] == data.plan_id), None)
    if plan is None:
        return error(404, f"Plan not found: {data.plan_id}")

    order = Order(
        user_id=str(current_user.id),
        plan_id=data.plan_id,
        amount=plan["price_cents"],
        credits_granted=plan["credits"],
        payment_method=data.payment_method,
        payment_status="pending",
    )

    try:
        db.add(order)
        db.commit()
        db.refresh(order)
    except IntegrityError:
        db.rollback()
        return error(500, "Failed to create order")

    return success({
        "id": str(order.id),
        "plan_id": order.plan_id,
        "amount": order.amount,
        "credits_granted": order.credits_granted,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    })


@router.post("/verify-card-test")
def verify_card_test(request: Request) -> dict:
    """Test endpoint – no deps."""
    return {"code": 0, "data": {"msg": "test ok"}, "message": "ok"}


@router.post("/verify-card", response_model=dict)
def verify_card_key(
    data: CardKeyRecharge,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """Verify card key and recharge credits (MVP main payment method)."""
    credits = _verify_card_key(data.card_key)
    if credits is None:
        return error(400, "Invalid or used card key")

    # Grant credits
    grant(db, str(current_user.id), credits, f"卡密充值 {data.card_key}")

    # Update user's total_recharged
    account = db.query(CreditAccount).filter(CreditAccount.user_id == str(current_user.id)).first()
    if account:
        account.total_recharged += credits
        db.commit()

    # TODO: mark card key as used (in production, store used keys in DB)

    balance = get_balance(db, str(current_user.id))
    return success({
        "credits_granted": credits,
        "balance": balance["balance"],
        "message": f"成功充值 {credits} 积分",
    })


@router.get("/list", response_model=dict)
def list_orders(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """List current user's orders (paginated)."""
    query = db.query(Order).filter(Order.user_id == str(current_user.id))
    total = query.count()
    offset = (page - 1) * page_size
    orders = (
        query.order_by(Order.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return success({
        "items": [
            {
                "id": str(o.id),
                "plan_id": o.plan_id,
                "amount": o.amount,
                "credits_granted": o.credits_granted,
                "payment_method": o.payment_method,
                "payment_status": o.payment_status,
                "paid_at": o.paid_at.isoformat() if o.paid_at else None,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in orders
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    })


@router.get("/{order_id}", response_model=dict)
def get_order_detail(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """Get order detail by ID."""
    order = (
        db.query(Order)
        .filter(Order.id == order_id, Order.user_id == str(current_user.id))
        .first()
    )
    if order is None:
        return error(404, "Order not found")

    return success({
        "id": str(order.id),
        "plan_id": order.plan_id,
        "amount": order.amount,
        "credits_granted": order.credits_granted,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status,
        "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    })
