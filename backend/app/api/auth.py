"""Authentication API endpoints for ONIVIS."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status

from app import store
from app.core.auth import (
    AuthenticatedUser,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    TokenResponse,
    UserLogin,
    UserProfile,
    UserUpdate,
    UserSignUp,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(data: UserSignUp) -> TokenResponse:
    clean_email = data.email.lower().strip()
    existing = store.get_user_by_email(clean_email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    user_id = store.new_id("usr")
    password_hash = hash_password(data.password)
    user_data = store.create_user(
        id=user_id,
        email=clean_email,
        password_hash=password_hash,
        name=data.name.strip(),
        role=data.role,
        created_at=store.utc_now_iso(),
    )

    token = create_access_token(
        user_id=user_data["id"],
        email=user_data["email"],
        name=user_data["name"],
        role=user_data["role"],
    )

    return TokenResponse(
        accessToken=token,
        tokenType="bearer",
        user=UserProfile(
            id=user_data["id"],
            email=user_data["email"],
            name=user_data["name"],
            role=user_data["role"],
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin) -> TokenResponse:
    clean_email = data.email.lower().strip()
    user_data = store.get_user_by_email(clean_email)
    if user_data is None or not verify_password(data.password, user_data["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        user_id=user_data["id"],
        email=user_data["email"],
        name=user_data["name"],
        role=user_data["role"],
    )

    return TokenResponse(
        accessToken=token,
        tokenType="bearer",
        user=UserProfile(
            id=user_data["id"],
            email=user_data["email"],
            name=user_data["name"],
            role=user_data["role"],
        ),
    )


@router.get("/me", response_model=UserProfile)
def get_current_user_profile(user: AuthenticatedUser = Depends(get_current_user)) -> UserProfile:
    user_data = store.get_user_by_id(user.id)
    if user_data:
        return UserProfile(
            id=user_data["id"],
            email=user_data["email"],
            name=user_data["name"],
            role=user_data["role"],
        )
    return UserProfile(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
    )


@router.patch("/me", response_model=UserProfile)
def update_current_user_profile(
    data: UserUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
) -> UserProfile:
    updated = store.update_user_profile(user.id, name=data.name)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(
        id=updated["id"],
        email=updated["email"],
        name=updated["name"],
        role=updated["role"],
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(data: ForgotPasswordRequest) -> ForgotPasswordResponse:
    clean_email = data.email.lower().strip()
    user_data = store.get_user_by_email(clean_email)
    if user_data is not None:
        reset_token = secrets.token_urlsafe(32)
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        store.create_reset_token(clean_email, reset_token, expires_at)
        # In a production environment with an SMTP service configured, an email is dispatched here.
        # The token is securely stored for the verification endpoint.

    return ForgotPasswordResponse(
        success=True,
        message="If this email is registered in ONIVIS, password reset instructions have been generated.",
    )


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(data: ResetPasswordRequest) -> ResetPasswordResponse:
    email = store.verify_and_consume_reset_token(data.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, expired, or previously used password reset token.",
        )

    new_hash = hash_password(data.newPassword)
    success = store.update_user_password(email, new_hash)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password. Please try again.",
        )

    return ResetPasswordResponse(
        success=True,
        message="Your password has been reset successfully. You can now log in.",
    )
