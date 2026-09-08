"""Authentication and user schemas."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, EmailStr, Field


class UserSignUp(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    name: str = Field(..., min_length=1, description="Full name or inspector name")
    role: Literal["INSPECTOR", "ADMIN", "OFFICER", "FARMER"] = "INSPECTOR"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    role: str = "INSPECTOR"


class TokenResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    user: UserProfile


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    success: bool
    message: str


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=1)
    newPassword: str = Field(..., min_length=6)


class ResetPasswordResponse(BaseModel):
    success: bool
    message: str


class UserUpdate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
