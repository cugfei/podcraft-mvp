"""Admin dependency — allow only admin users."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.v1.auth import get_current_user

security = HTTPBearer(auto_error=False)


def get_current_admin(
    creds: HTTPAuthorizationCredentials = Depends(security),
) -> "User":
    """Return the current user only if ``role == "admin"``."""
    from sqlalchemy.orm import Session
    from app.database import get_session

    db: Session = next(get_session())
    user = get_current_user(creds, db)
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
