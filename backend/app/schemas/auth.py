"""Pydantic schemas for authentication endpoints."""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------


class UserRegister(BaseModel):
    """Payload for user registration."""

    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str = Field(..., min_length=6, max_length=128)
    nickname: Optional[str] = Field(None, max_length=100)

    class Config:
        # Allow extra fields to be ignored
        extra = "ignore"


class UserLogin(BaseModel):
    """Payload for user login (email or phone + password)."""

    username: str = Field(..., description="Email or phone number")
    password: str = Field(..., min_length=6, max_length=128)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: Optional[str] = None
    nickname: Optional[str] = None


class UserMeResponse(BaseModel):
    """Current user info response."""

    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    nickname: Optional[str] = None
    role: str
    status: str
    created_at: str

    class Config:
        from_attributes = True
