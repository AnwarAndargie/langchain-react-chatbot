"""Authentication router"""

import time
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.utils.supabase_auth import signup_user, signin_user, signout_user, AuthRateLimitError
from app.middleware import get_current_user

router = APIRouter()


def _expires_in_seconds(expires_at: float | None) -> int:
    """Compute expires_in (seconds until expiry) from Supabase session expires_at (Unix timestamp)."""
    if expires_at is None:
        return 86400  # 24h default
    now = time.time()
    return max(0, int(expires_at - now))


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """
    Register a new user. Returns Supabase access token when email confirmation
    is disabled; when confirmation is enabled, returns requires_confirmation
    and a message to check email.
    """
    try:
        user_data, error = signup_user(request.email, request.password)
    except AuthRateLimitError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        ) from e

    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error,
        )

    if user_data.get("requires_confirmation"):
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "requires_confirmation": True,
                "message": "Check your email to confirm your account.",
            },
        )

    return AuthResponse(
        access_token=user_data["access_token"],
        token_type="bearer",
        user_id=user_data["id"],
        email=user_data["email"],
        expires_in=_expires_in_seconds(user_data.get("expires_at")),
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login user. Returns Supabase access token so the client can use it for API auth
    and so RLS applies correctly on the backend.
    """
    try:
        auth_data, error = signin_user(request.email, request.password)
    except AuthRateLimitError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        ) from e

    if error or not auth_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error or "Invalid credentials"
        )

    user = auth_data["user"]
    return AuthResponse(
        access_token=auth_data["access_token"],
        token_type="bearer",
        user_id=user["id"],
        email=user["email"],
        expires_in=_expires_in_seconds(auth_data.get("expires_at")),
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(user: dict = Depends(get_current_user)):
    """
    Logout user (invalidate session)
    
    Args:
        user: Current authenticated user from middleware
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If user is not authenticated
    """
    token = user.get("token", "")
    
    if token:
        signout_user(token)
    
    return {
        "message": "Successfully logged out",
        "status": "success"
    }


@router.get("/me", response_model=dict)
async def get_current_user_info(user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information
    
    Args:
        user: Current authenticated user from middleware
        
    Returns:
        User information dictionary
    """
    return {
        "user_id": str(user["user_id"]),
        "email": user["email"]
    }
