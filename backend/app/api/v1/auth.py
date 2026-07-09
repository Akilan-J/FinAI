from datetime import datetime, timezone, timedelta
import hashlib
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.api.deps import get_current_user
from app.core import security
from app.db.session import get_db
from app.models.session import UserSession
from app.models.user import User
from app.schemas.auth import (
    ResponseEnvelope,
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
)

router = APIRouter()


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/register", response_model=ResponseEnvelope[UserResponse])
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    hashed_pwd = security.get_password_hash(payload.password)
    user = User(
        email=payload.email,
        password_hash=hashed_pwd,
        full_name=payload.full_name,
        auth_provider="local",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return ResponseEnvelope(data=UserResponse.model_validate(user))


@router.post("/login", response_model=ResponseEnvelope[TokenResponse])
async def login(
    response: Response,
    payload: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalars().first()
    if not user or not user.password_hash or not security.verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = security.create_access_token(user.id)
    refresh_token = security.create_refresh_token(user.id)

    refresh_data = security.decode_token(refresh_token)
    if not refresh_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate session",
        )

    expires_at = datetime.fromtimestamp(refresh_data["exp"], timezone.utc)
    token_hash = hash_token(refresh_token)

    session = UserSession(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(session)
    await db.commit()

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # Set to True in production
        samesite="lax",
        expires=expires_at,
    )

    return ResponseEnvelope(data=TokenResponse(access_token=access_token))


@router.post("/refresh", response_model=ResponseEnvelope[TokenResponse])
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    refresh_data = security.decode_token(refresh_token)
    if not refresh_data or refresh_data.get("type") != "refresh":
        response.delete_cookie("refresh_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = refresh_data.get("sub")
    token_hash = hash_token(refresh_token)

    result = await db.execute(
        select(UserSession).where(
            UserSession.token_hash == token_hash,
            UserSession.revoked == False,
        )
    )
    db_session = result.scalars().first()
    if not db_session or db_session.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        response.delete_cookie("refresh_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or revoked",
        )

    new_access_token = security.create_access_token(user_id)
    new_refresh_token = security.create_refresh_token(user_id)

    new_refresh_data = security.decode_token(new_refresh_token)
    new_expires_at = datetime.fromtimestamp(new_refresh_data["exp"], timezone.utc)
    new_token_hash = hash_token(new_refresh_token)

    db_session.token_hash = new_token_hash
    db_session.expires_at = new_expires_at
    db_session.created_at = datetime.now(timezone.utc)
    await db.commit()

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        expires=new_expires_at,
    )

    return ResponseEnvelope(data=TokenResponse(access_token=new_access_token))


@router.post("/logout", response_model=ResponseEnvelope[dict])
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    if refresh_token:
        token_hash = hash_token(refresh_token)
        result = await db.execute(
            select(UserSession).where(UserSession.token_hash == token_hash)
        )
        db_session = result.scalars().first()
        if db_session:
            db_session.revoked = True
            await db.commit()

    response.delete_cookie("refresh_token")
    return ResponseEnvelope(data={"message": "Logged out successfully"})


@router.post("/forgot-password", response_model=ResponseEnvelope[dict])
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalars().first()
    if not user:
        return ResponseEnvelope(data={"message": "If the email exists, a reset link has been sent."})

    reset_token = security.create_access_token(user.id, expires_delta=timedelta(hours=1))

    return ResponseEnvelope(
        data={
            "message": "Reset link generated.",
            "dev_reset_token": reset_token,
        }
    )


@router.post("/reset-password", response_model=ResponseEnvelope[dict])
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    token_data = security.decode_token(payload.token)
    if not token_data or token_data.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user_id = token_data.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.password_hash = security.get_password_hash(payload.new_password)

    session_result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == user.id,
            UserSession.revoked == False,
        )
    )
    for session in session_result.scalars().all():
        session.revoked = True

    await db.commit()
    return ResponseEnvelope(data={"message": "Password reset successfully"})


@router.get("/me", response_model=ResponseEnvelope[UserResponse])
async def get_me(current_user: User = Depends(get_current_user)):
    return ResponseEnvelope(data=UserResponse.model_validate(current_user))
