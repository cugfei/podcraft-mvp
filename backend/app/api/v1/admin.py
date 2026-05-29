"""Admin-only API routes — T-4.9."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.admin_deps import get_current_admin
from app.database import get_session
from app.models.user import User
from app.models.credit import CreditAccount, CreditTransaction
from app.models.podcast import PodcastProject
from app.models.synthesis_task import SynthesisTask
from app.models.voice import VoicePreset
from app.utils.response import success, error

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _paginate(q, skip: int = 0, limit: int = 20):
    total = q.count()
    items = q.offset(skip).limit(limit).all()
    return total, items


# ---------------------------------------------------------------------------
# 1. 用户管理
# ---------------------------------------------------------------------------

@router.get("/users")
def list_users(
    q: Optional[str] = Query(default="", description="搜索 email/nickname"),
    status: Optional[str] = Query(default="", description="active|disabled|deleted"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """List all users with search & pagination."""
    query = db.query(User)
    if q:
        q_like = f"%{q}%"
        query = query.filter(
            (User.email.ilike(q_like)) | (User.nickname.ilike(q_like))
        )
    if status:
        query = query.filter(User.status == status)
    query = query.order_by(User.created_at.desc())
    total, items = _paginate(query, skip, limit)
    return success(data={
        "total": total,
        "items": [
            {
                "id": u.id,
                "email": u.email,
                "nickname": u.nickname,
                "role": u.role,
                "status": u.status,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "credit_balance": u.credit_account.balance if u.credit_account else 0,
            }
            for u in items
        ],
    })


@router.patch("/users/{user_id}/disable")
def disable_user(
    user_id: str,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """Disable a user (set status=disabled)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return error(code=404, message="用户不存在")
    user.status = "disabled"
    db.commit()
    return success(message="用户已禁用")


@router.patch("/users/{user_id}/enable")
def enable_user(
    user_id: str,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """Re-enable a disabled user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return error(code=404, message="用户不存在")
    user.status = "active"
    db.commit()
    return success(message="用户已启用")


# ---------------------------------------------------------------------------
# 2. 积分调整
# ---------------------------------------------------------------------------

@router.post("/credits/adjust")
def adjust_credit(
    body: dict,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """
    Adjust a user's credits.
    Body: { user_id, amount, reason }
    - amount > 0: grant; amount < 0: deduct.
    """
    user_id = body.get("user_id", "")
    amount = body.get("amount", 0)
    reason = body.get("reason", "admin_adjust")

    if not user_id or amount == 0:
        return error(code=400, message="参数错误")

    acct = db.query(CreditAccount).filter(CreditAccount.user_id == user_id).first()
    if not acct:
        return error(code=404, message="用户积分账户不存在")

    acct.balance += int(amount)
    if acct.balance < 0:
        acct.balance -= int(amount)
        return error(code=400, message="积分余额不足")

    tx = CreditTransaction(
        user_id=user_id,
        type="admin_adjust",
        amount=int(amount),
        balance_after=acct.balance,
        reference_type="admin",
        description=reason,
    )
    db.add(tx)
    db.commit()
    return success(data={"balance": acct.balance}, message="积分调整成功")


@router.get("/credits/ledger")
def credit_ledger(
    user_id: Optional[str] = Query(default=""),
    tx_type: Optional[str] = Query(default=""),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """View credit transaction ledger."""
    query = db.query(CreditTransaction)
    if user_id:
        query = query.filter(CreditTransaction.user_id == user_id)
    if tx_type:
        query = query.filter(CreditTransaction.type == tx_type)
    query = query.order_by(CreditTransaction.created_at.desc())
    total, items = _paginate(query, skip, limit)
    return success(data={
        "total": total,
        "items": [tx.to_dict() for tx in items],
    })


# ---------------------------------------------------------------------------
# 3. 播客项目管理
# ---------------------------------------------------------------------------

@router.get("/podcasts")
def list_all_podcasts(
    status: Optional[str] = Query(default=""),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """List all podcast projects (admin)."""
    query = db.query(PodcastProject)
    if status:
        query = query.filter(PodcastProject.status == status)
    query = query.order_by(PodcastProject.updated_at.desc())
    total, items = _paginate(query, skip, limit)
    return success(data={
        "total": total,
        "items": [p.to_dict() for p in items],
    })


@router.delete("/podcasts/{project_id}")
def delete_podcast_admin(
    project_id: str,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """Admin: hard-delete a podcast project."""
    proj = db.query(PodcastProject).filter(PodcastProject.id == project_id).first()
    if not proj:
        return error(code=404, message="项目不存在")
    db.delete(proj)
    db.commit()
    return success(message="播客项目已删除")


# ---------------------------------------------------------------------------
# 4. 合成任务管理
# ---------------------------------------------------------------------------

@router.get("/synthesis-tasks")
def list_synthesis_tasks(
    status: Optional[str] = Query(default=""),
    user_id: Optional[str] = Query(default=""),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """List all synthesis tasks (admin)."""
    query = db.query(SynthesisTask)
    if status:
        query = query.filter(SynthesisTask.status == status)
    if user_id:
        query = query.filter(SynthesisTask.user_id == user_id)
    query = query.order_by(SynthesisTask.created_at.desc())
    total, items = _paginate(query, skip, limit)
    return success(data={
        "total": total,
        "items": [t.to_dict() for t in items],
    })


# ---------------------------------------------------------------------------
# 5. 错误日志（简单版 — 使用 Python logging 记录）
# ---------------------------------------------------------------------------

@router.get("/error-logs")
def list_error_logs(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """
    Return recent error logs.
    MVP: return empty list + note to check server logs.
    Future: read from app.log / ErrorLog model.
    """
    return success(data={
        "total": 0,
        "items": [],
        "note": "Check server logs for errors (MVP)",
    })


# ---------------------------------------------------------------------------
# 6. 音色配置（VoicePreset CRUD）
# ---------------------------------------------------------------------------

@router.get("/voices")
def list_all_voices(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """List all voice presets (admin)."""
    voices = db.query(VoicePreset).order_by(VoicePreset.created_at.desc()).all()
    return success(data={"items": [v.to_dict() for v in voices]})


@router.post("/voices")
def create_voice(
    body: dict,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """Create a new voice preset."""
    from app.models.voice import VoicePreset

    v = VoicePreset(
        provider=body.get("provider", "minimax"),
        provider_voice_id=body.get("provider_voice_id", ""),
        name=body.get("name", ""),
        language=body.get("language", "zh"),
        gender=body.get("gender"),
        voice_params=body.get("voice_params"),
        is_cloned=body.get("is_cloned", False),
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return success(data=v.to_dict(), message="音色已创建")


@router.patch("/voices/{voice_id}")
def update_voice(
    voice_id: str,
    body: dict,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """Update a voice preset."""
    v = db.query(VoicePreset).filter(VoicePreset.id == voice_id).first()
    if not v:
        return error(code=404, message="音色不存在")
    for key in ("name", "provider", "provider_voice_id", "language", "voice_params", "is_cloned"):
        if key in body:
            setattr(v, key, body[key])
    db.commit()
    return success(data=v.to_dict(), message="音色已更新")


@router.delete("/voices/{voice_id}")
def delete_voice(
    voice_id: str,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """Delete a voice preset."""
    v = db.query(VoicePreset).filter(VoicePreset.id == voice_id).first()
    if not v:
        return error(code=404, message="音色不存在")
    db.delete(v)
    db.commit()
    return success(message="音色已删除")


# ---------------------------------------------------------------------------
# 7. Provider 配置（DB 持久化）
# ---------------------------------------------------------------------------

from app.database import get_session
from app.models.provider_config import load_provider_config, update_provider_config


@router.get("/providers")
def get_provider_config(
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """Get TTS Provider configuration from DB."""
    config = load_provider_config(db)
    # Convert boolean-ish strings to actual bool for edge_tts_enabled
    config["edge_tts_enabled"] = config.get("edge_tts_enabled", "true").lower() == "true"
    return success(data=config)


@router.patch("/providers")
def update_provider_config_endpoint(
    body: dict,
    _admin: User = Depends(get_current_admin),
    db: Session = Depends(get_session),
):
    """Update TTS Provider configuration and persist to DB."""
    updated = update_provider_config(db, body)
    updated["edge_tts_enabled"] = updated.get("edge_tts_enabled", "true").lower() == "true"
    return success(data=updated, message="Provider 配置已更新")


# ---------------------------------------------------------------------------
# 8. 套餐配置（Plan CRUD — MVP 简化）
# ---------------------------------------------------------------------------

# MVP: simple in-memory plans (replace with DB model later)
_PLANS = [
    {"id": "plan_free", "name": "免费版", "price": 0, "credits": 500},
    {"id": "plan_basic", "name": "基础版", "price": 9.9, "credits": 1000},
    {"id": "plan_pro", "name": "专业版", "price": 29.9, "credits": 5000},
]


@router.get("/plans")
def list_plans(
    _admin: User = Depends(get_current_admin),
):
    """List all pricing plans."""
    return success(data={"items": _PLANS})


@router.post("/plans")
def create_plan(
    body: dict,
    _admin: User = Depends(get_current_admin),
):
    """Create a new plan."""
    new_plan = {
        "id": body.get("id", f"plan_{len(_PLANS)}"),
        "name": body.get("name", ""),
        "price": body.get("price", 0),
        "credits": body.get("credits", 0),
    }
    _PLANS.append(new_plan)
    return success(data=new_plan, message="套餐已创建")


@router.patch("/plans/{plan_id}")
def update_plan(
    plan_id: str,
    body: dict,
    _admin: User = Depends(get_current_admin),
):
    """Update a plan."""
    for p in _PLANS:
        if p["id"] == plan_id:
            for key in ("name", "price", "credits"):
                if key in body:
                    p[key] = body[key]
            return success(data=p, message="套餐已更新")
    return error(code=404, message="套餐不存在")


@router.delete("/plans/{plan_id}")
def delete_plan(
    plan_id: str,
    _admin: User = Depends(get_current_admin),
):
    """Delete a plan."""
    global _PLANS
    before = len(_PLANS)
    _PLANS = [p for p in _PLANS if p["id"] != plan_id]
    if len(_PLANS) == before:
        return error(code=404, message="套餐不存在")
    return success(message="套餐已删除")
