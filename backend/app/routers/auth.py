"""Authentication router"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.utils.auth import create_access_token
from app.utils.supabase_auth import signup_user, signin_user, signout_user, AuthRateLimitError
from app.middleware import get_current_user
from datetime import timedelta

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    """
    Register a new user
    
    Args:
        request: Registration request with email and password
        
    Returns:
        AuthResponse with access token and user information
        
    Raises:
        HTTPException: If registration fails
    """
    # Register user with Supabase
    try:
        user_data, error = signup_user(request.email, request.password)
    except AuthRateLimitError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e),
        ) from e

    if error or not user_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error or "Registration failed"
        )
    
    # Create JWT access token
    access_token = create_access_token(
        user_id=user_data["id"],
        email=user_data["email"]
    )
    
    # Calculate expiration time in seconds
    from app.core import settings
    expires_in = settings.jwt_expiration_hours * 3600
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user_data["id"],
        email=user_data["email"],
        expires_in=expires_in
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Login user and return access token
    
    Args:
        request: Login request with email and password
        
    Returns:
        AuthResponse with access token and user information
        
    Raises:
        HTTPException: If login fails
    """
    # Authenticate user with Supabase
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
    
    # Create JWT access token
    access_token = create_access_token(
        user_id=user["id"],
        email=user["email"]
    )
    
    # Calculate expiration time in seconds
    from app.core import settings
    expires_in = settings.jwt_expiration_hours * 3600
    
    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user["id"],
        email=user["email"],
        expires_in=expires_in
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
