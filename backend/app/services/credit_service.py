"""Credit service – freeze / deduct / refund / grant with optimistic concurrency."""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.credit import CreditAccount, CreditTransaction
from app.utils.response import error


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_REFUND_ATTEMPTS = 3  # 同一段 >3 次退回触发风控


# ---------------------------------------------------------------------------
# Helper – ensure account exists
# ---------------------------------------------------------------------------


def _get_or_create_account(db: Session, user_id: str) -> CreditAccount:
    """Return existing CreditAccount or create one if missing."""
    account = db.query(CreditAccount).filter(CreditAccount.user_id == user_id).first()
    if account is None:
        account = CreditAccount(
            user_id=user_id,
            balance=0,
            frozen=0,
            total_recharged=0,
            total_consumed=0,
            version=0,
        )
        db.add(account)
        db.commit()
        db.refresh(account)
    return account


# ---------------------------------------------------------------------------
# Core operations
# ---------------------------------------------------------------------------


def freeze(db: Session, user_id: str, amount: int, reference: str) -> bool:
    """Freeze *amount* credits for *user_id*.

    Returns ``True`` on success, ``False`` if insufficient balance.

    *reference* format: ``"podcast:<podcast_id>"`` / ``"segment:<segment_id>"``
    """
    if amount <= 0:
        raise ValueError("amount must be positive")

    account = _get_or_create_account(db, user_id)

    if account.available < amount:
        return False

    # Optimistic lock update
    rows = (
        db.query(CreditAccount)
        .filter(
            CreditAccount.id == account.id,
            CreditAccount.version == account.version,
        )
        .update(
            {
                "balance": CreditAccount.balance - amount,
                "frozen": CreditAccount.frozen + amount,
                "version": CreditAccount.version + 1,
            }
        )
    )

    if rows == 0:
        # Version conflict – retry by caller
        raise ValueError("Concurrent update conflict – retry")

    # Create ledger entry
    tx = CreditTransaction(
        user_id=user_id,
        account_id=account.id,
        type="freeze",
        amount=-amount,
        balance_after=account.balance - amount,
        reference_type="freeze",
        reference_id=reference,
        description=f"Freeze {amount} credits for {reference}",
    )
    db.add(tx)
    db.commit()
    return True


def deduct(db: Session, user_id: str, amount: int, reference: str) -> bool:
    """Move *amount* from frozen to consumed (actual charge).

    Returns ``True`` on success.
    """
    if amount <= 0:
        raise ValueError("amount must be positive")

    account = _get_or_create_account(db, user_id)

    if account.frozen < amount:
        return False

    # Optimistic lock update
    rows = (
        db.query(CreditAccount)
        .filter(
            CreditAccount.id == account.id,
            CreditAccount.version == account.version,
        )
        .update(
            {
                "frozen": CreditAccount.frozen - amount,
                "total_consumed": CreditAccount.total_consumed + amount,
                "version": CreditAccount.version + 1,
            }
        )
    )

    if rows == 0:
        raise ValueError("Concurrent update conflict – retry")

    # Create ledger entry
    tx = CreditTransaction(
        user_id=user_id,
        account_id=account.id,
        type="deduct",
        amount=-amount,
        balance_after=account.balance,
        reference_type="deduct",
        reference_id=reference,
        description=f"Deduct {amount} credits for {reference}",
    )
    db.add(tx)
    db.commit()
    return True


def refund(db: Session, user_id: str, amount: int, reference: str) -> bool:
    """Refund *amount* from frozen back to balance (synthesis failed).

    Returns ``True`` on success.
    """
    if amount <= 0:
        raise ValueError("amount must be positive")

    account = _get_or_create_account(db, user_id)

    if account.frozen < amount:
        return False

    # Optimistic lock update
    rows = (
        db.query(CreditAccount)
        .filter(
            CreditAccount.id == account.id,
            CreditAccount.version == account.version,
        )
        .update(
            {
                "balance": CreditAccount.balance + amount,
                "frozen": CreditAccount.frozen - amount,
                "version": CreditAccount.version + 1,
            }
        )
    )

    if rows == 0:
        raise ValueError("Concurrent update conflict – retry")

    # Create ledger entry
    tx = CreditTransaction(
        user_id=user_id,
        account_id=account.id,
        type="refund",
        amount=amount,
        balance_after=account.balance + amount,
        reference_type="refund",
        reference_id=reference,
        description=f"Refund {amount} credits for {reference}",
    )
    db.add(tx)
    db.commit()
    return True


def grant(db: Session, user_id: str, amount: int, description: str = "") -> None:
    """Grant *amount* credits to *user_id* (register / daily login / admin)."""
    if amount <= 0:
        raise ValueError("amount must be positive")

    account = _get_or_create_account(db, user_id)

    # Optimistic lock update
    rows = (
        db.query(CreditAccount)
        .filter(
            CreditAccount.id == account.id,
            CreditAccount.version == account.version,
        )
        .update(
            {
                "balance": CreditAccount.balance + amount,
                "version": CreditAccount.version + 1,
            }
        )
    )

    if rows == 0:
        raise ValueError("Concurrent update conflict – retry")

    # Create ledger entry
    tx = CreditTransaction(
        user_id=user_id,
        account_id=account.id,
        type="grant",
        amount=amount,
        balance_after=account.balance + amount,
        reference_type="grant",
        reference_id="",
        description=description or f"Grant {amount} credits",
    )
    db.add(tx)
    db.commit()


def get_balance(db: Session, user_id: str) -> dict:
    """Return current balance summary for *user_id*."""
    account = _get_or_create_account(db, user_id)
    return {
        "balance": account.balance,
        "frozen": account.frozen,
        "available": account.available,
        "total_recharged": account.total_recharged,
        "total_consumed": account.total_consumed,
    }


def check_daily_grant(db: Session, user_id: str, grant_type: str = "daily_login") -> bool:
    """Check if *user_id* already received *grant_type* today.

    Returns ``True`` if grant was already given today (skip duplicate).
    """
    from datetime import date

    today = date.today()
    existing = (
        db.query(CreditTransaction)
        .filter(
            CreditTransaction.user_id == user_id,
            CreditTransaction.type == "grant",
            CreditTransaction.description.like(f"%{grant_type}%"),
            CreditTransaction.created_at >= today,
        )
        .first()
    )
    return existing is not None
