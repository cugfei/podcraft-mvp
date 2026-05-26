"""Credit balance and ledger API – GET /api/credits/*."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_session
from app.models.credit import CreditTransaction
from app.models.user import User
from app.services.credit_service import get_balance, check_daily_grant
from app.utils.response import success, error
from app.api.v1.auth import get_current_user


router = APIRouter(tags=["credits"])


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/balance", response_model=dict)
def get_credit_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """Return current user's credit balance summary."""
    data = get_balance(db, str(current_user.id))
    return success(data)


@router.get("/ledger", response_model=dict)
def get_credit_ledger(
    type: Optional[str] = Query(default=None, description="Filter by type: grant/recharge/freeze/deduct/refund/adjust"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """Return current user's credit transaction ledger (paginated)."""
    query = (
        db.query(CreditTransaction)
        .filter(CreditTransaction.user_id == str(current_user.id))
    )

    if type:
        query = query.filter(CreditTransaction.type == type)

    total = query.count()
    offset = (page - 1) * page_size
    records = (
        query.order_by(CreditTransaction.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return success({
        "items": [tx.to_dict() for tx in records],
        "total": total,
        "page": page,
        "page_size": page_size,
    })


@router.get("/daily-grant-status", response_model=dict)
def get_daily_grant_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
) -> dict:
    """Check if user already received daily login grant today."""
    already_granted = check_daily_grant(db, str(current_user.id), "daily_login")
    return success({
        "daily_login_granted": already_granted,
    })
