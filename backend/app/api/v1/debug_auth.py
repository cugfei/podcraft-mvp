"""Test route for debugging auth issues."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_session
from app.core.security import decode_access_token

router = APIRouter()


@router.get("/api/v1/debug/token")
def debug_token(
    creds: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_session),
):
    """Debug endpoint — decode token and return payload."""
    if creds is None:
        return {"code": 401, "message": "No credentials provided"}
    token = creds.credentials
    payload = decode_access_token(token)
    if payload is None:
        return {"code": 401, "message": "Token decode failed", "token_preview": token[:20]}
    user_id = payload.get("sub")
    from app.models.user import User
    user = db.query(User).filter(User.id == user_id).first()
    return {
        "code": 0,
        "data": {
            "token_preview": token[:20],
            "payload": payload,
            "user_found": user is not None,
            "user_id": user.id if user else None,
            "user_email": user.email if user else None,
        },
        "message": "ok",
    }
