"""Supabase authentication operations"""

from typing import Optional, Tuple
from uuid import UUID

from app.core import settings
from app.services.db.supabase_client import get_supabase_client, get_supabase_admin_client


class AuthRateLimitError(Exception):
    """Raised when Supabase auth rate limit is exceeded."""
    pass


def signup_user(email: str, password: str) -> Tuple[Optional[dict], Optional[str]]:
    """
    Register a new user with Supabase Auth
    
    Args:
        email: User email address
        password: User password
        
    Returns:
        Tuple of (user_data, error_message)
        - user_data: User dictionary if successful, None otherwise
        - error_message: Error message if failed, None otherwise
    """
    try:
        client = get_supabase_client()
        response = client.auth.sign_up({
            "email": email,
            "password": password,
        })
        
        if response.user:
            return {
                "id": UUID(response.user.id),
                "email": response.user.email,
            }, None
        else:
            return None, "Failed to create user"
            
    except Exception as e:
        err = str(e).lower()
        if "rate limit" in err or "rate_limit" in err:
            raise AuthRateLimitError(
                "Too many sign-up attempts. Please try again in an hour."
            ) from e
        return None, str(e)


def signin_user(email: str, password: str) -> Tuple[Optional[dict], Optional[str]]:
    """
    Sign in a user with Supabase Auth
    
    Args:
        email: User email address
        password: User password
        
    Returns:
        Tuple of (auth_data, error_message)
        - auth_data: Dictionary with user and session info if successful, None otherwise
        - error_message: Error message if failed, None otherwise
    """
    try:
        client = get_supabase_client()
        response = client.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
        
        if response.user and response.session:
            return {
                "user": {
                    "id": UUID(response.user.id),
                    "email": response.user.email,
                },
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_at": response.session.expires_at,
            }, None
        else:
            return None, "Invalid credentials"
            
    except Exception as e:
        error_msg = str(e)
        err_lower = error_msg.lower()
        if "rate limit" in err_lower or "rate_limit" in err_lower:
            raise AuthRateLimitError(
                "Too many login attempts. Please try again in an hour."
            ) from e
        if "email not confirmed" in err_lower:
            return None, "Email not confirmed. Please check your inbox and click the confirmation link."
        if "invalid login credentials" in err_lower:
            return None, "Invalid email or password"
        return None, error_msg


def verify_supabase_token(token: str) -> Tuple[Optional[dict], Optional[str]]:
    """
    Verify a Supabase JWT token and get user information
    
    Args:
        token: Supabase JWT token
        
    Returns:
        Tuple of (user_data, error_message)
        - user_data: User dictionary if token is valid, None otherwise
        - error_message: Error message if token is invalid, None otherwise
    """
    try:
        # Create a client and set the session token
        client = get_supabase_client()
        
        # Get the current user using the token
        user_response = client.auth.get_user(token)
        
        if user_response and user_response.user:
            return {
                "id": UUID(user_response.user.id),
                "email": user_response.user.email or "",
            }, None
        else:
            return None, "Invalid token"
            
    except Exception as e:
        return None, f"Token verification failed: {str(e)}"


def get_user_by_id(user_id: UUID) -> Optional[dict]:
    """
    Get user information by ID using admin client
    
    Args:
        user_id: User UUID
        
    Returns:
        User dictionary or None if not found
    """
    try:
        admin_client = get_supabase_admin_client()
        # Note: This requires admin access. In production, use Supabase Admin API
        # For now, we'll rely on auth.get_user() which requires a valid token
        return None
    except Exception as e:
        return None


def signout_user(token: str) -> bool:
    """
    Sign out a user (invalidate session)
    
    Args:
        token: User's access token
        
    Returns:
        True if successful, False otherwise
    """
    try:
        client = get_supabase_client()
        client.auth.set_session(token)
        client.auth.sign_out()
        return True
    except Exception:
        return False
