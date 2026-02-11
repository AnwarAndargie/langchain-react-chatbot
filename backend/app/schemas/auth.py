"""Authentication request and response schemas"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class RegisterRequest(BaseModel):
    """User registration request schema"""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (minimum 8 characters)")


class LoginRequest(BaseModel):
    """User login request schema"""
    
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class AuthResponse(BaseModel):
    """Authentication response schema"""
    
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user_id: UUID = Field(..., description="User UUID")
    email: str = Field(..., description="User email address")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class UserInfo(BaseModel):
    """User information schema"""
    
    id: UUID = Field(..., description="User UUID")
    email: str = Field(..., description="User email address")
    created_at: datetime = Field(..., description="Account creation timestamp")


class TokenData(BaseModel):
    """Token payload data schema"""
    
    user_id: UUID = Field(..., description="User UUID")
    email: str = Field(..., description="User email address")
    exp: int = Field(..., description="Token expiration timestamp")
