"""Authentication routes — register, login, refresh, get current user."""

from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_session
from app.models.credit import CreditAccount
from app.models.user import User
from app.schemas.auth import UserLogin, UserMeResponse, UserRegister, TokenResponse
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.utils.response import success, error
from app.services.credit_service import grant, _get_or_create_account

settings = get_settings()
router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
# Bearer token extractor
security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_session),
) -> User:
    """Dependency that returns the authenticated ``User`` or raises 401."""
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(creds.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user: Optional[User] = (
        db.query(User).filter(User.id == user_id).first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/register", response_model=dict)
def register(data: UserRegister, db: Session = Depends(get_session)) -> dict:
    """Register a new user and return JWT tokens.

    At least one of *email* or *phone* must be provided.
    """
    if not data.email and not data.phone:
        return error(400, "Email or phone is required")

    # Check for duplicate email/phone
    if data.email:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            return error(409, "Email already registered")

    if data.phone:
        existing = db.query(User).filter(User.phone == data.phone).first()
        if existing:
            return error(409, "Phone already registered")

    # Create user
    user = User(
        email=data.email,
        phone=data.phone,
        password_hash=get_password_hash(data.password),
        nickname=data.nickname,
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        return error(409, "Registration failed — duplicate account")

    # Create credit account and grant 500 welcome credits
    try:
        credit_account = CreditAccount(
            user_id=user.id,
            balance=0,
            frozen=0,
            total_recharged=0,
            total_consumed=0,
            version=0,
        )
        db.add(credit_account)
        db.commit()
        # Grant 500 welcome credits
        grant(db, user.id, 500, "注册赠送")
    except Exception:
        # Don't fail registration if credit init fails
        db.rollback()

    # Issue tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    return success(
        TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=user.id,
            email=user.email,
            nickname=user.nickname,
        ).dict()
    )


@router.post("/login", response_model=dict)
def login(data: UserLogin, db: Session = Depends(get_session)) -> dict:
    """Authenticate with email/phone + password and return JWT tokens."""
    # Find user by email or phone
    user: Optional[User] = None
    if "@" in data.username:
        user = db.query(User).filter(User.email == data.username).first()
    else:
        user = db.query(User).filter(User.phone == data.username).first()

    if user is None:
        return error(401, "Invalid credentials")

    if not verify_password(data.password, user.password_hash):
        return error(401, "Invalid credentials")

    if user.status != "active":
        return error(403, "Account is disabled")

    # Issue tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    return success(
        TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=user.id,
            email=user.email,
            nickname=user.nickname,
        ).dict()
    )


@router.post("/refresh", response_model=dict)
def refresh_token(data: Dict[str, str], db: Session = Depends(get_session)) -> dict:
    """Exchange a refresh token for a new access token.

    Request body: ``{"refresh_token": "<jwt>"}``
    """
    raw = data.get("refresh_token", "")
    if not raw:
        return error(400, "refresh_token is required")

    payload = decode_access_token(raw)
    if payload is None or payload.get("type") != "refresh":
        return error(401, "Invalid refresh token")

    user_id = payload.get("sub")
    if user_id is None:
        return error(401, "Invalid refresh token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or user.status != "active":
        return error(401, "User not found or disabled")

    new_access_token = create_access_token(user.id)
    return success({
        "access_token": new_access_token,
        "token_type": "bearer",
    })


@router.get("/me", response_model=dict)
def get_me(current_user: User = Depends(get_current_user)) -> dict:
    """Get current authenticated user info."""
    return success(
        UserMeResponse(
            id=current_user.id,
            email=current_user.email,
            phone=current_user.phone,
            nickname=current_user.nickname,
            role=current_user.role,
            status=current_user.status,
            created_at=current_user.created_at.isoformat() if current_user.created_at else "",
        ).dict()
    )
