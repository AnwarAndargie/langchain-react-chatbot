"""JWT token generation and validation utilities"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from jose import JWTError, jwt
from app.core import settings


def create_access_token(
    user_id: UUID,
    email: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token
    
    Args:
        user_id: User UUID
        email: User email address
        expires_delta: Optional expiration time delta
        
    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=settings.jwt_expiration_hours)
    
    to_encode = {
        "sub": str(user_id),
        "email": email,
        "exp": expire,
        "iat": datetime.utcnow(),
    }
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT access token
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload dictionary or None if invalid
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError:
        return None


def get_user_id_from_token(token: str) -> Optional[UUID]:
    """
    Extract user ID from JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        User UUID or None if token is invalid
    """
    payload = decode_access_token(token)
    if payload and "sub" in payload:
        try:
            return UUID(payload["sub"])
        except (ValueError, TypeError):
            return None
    return None


def get_email_from_token(token: str) -> Optional[str]:
    """
    Extract email from JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        User email or None if token is invalid
    """
    payload = decode_access_token(token)
    if payload and "email" in payload:
        return payload["email"]
    return None


def verify_token(token: str) -> bool:
    """
    Verify if a token is valid
    
    Args:
        token: JWT token string
        
    Returns:
        True if token is valid, False otherwise
    """
    payload = decode_access_token(token)
    return payload is not None
