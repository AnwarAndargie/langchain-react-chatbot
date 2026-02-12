"""Authentication middleware for protecting routes"""

from typing import Optional
from uuid import UUID
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.utils.auth import get_user_id_from_token, get_email_from_token, verify_token
from app.utils.supabase_auth import verify_supabase_token


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware to validate JWT tokens and inject user context"""

    async def dispatch(self, request: Request, call_next):
        # Skip auth for public endpoints
        if self._is_public_endpoint(request.url.path):
            return await call_next(request)

        # Extract token from Authorization header
        authorization: Optional[str] = request.headers.get("Authorization")
        
        if not authorization:
            return Response(
                content='{"detail":"Missing authorization header"}',
                status_code=status.HTTP_401_UNAUTHORIZED,
                media_type="application/json"
            )

        # Extract Bearer token
        try:
            scheme, token = authorization.split()
            if scheme.lower() != "bearer":
                raise ValueError("Invalid authorization scheme")
        except ValueError:
            return Response(
                content='{"detail":"Invalid authorization header format. Expected: Bearer <token>"}',
                status_code=status.HTTP_401_UNAUTHORIZED,
                media_type="application/json"
            )

        # Verify token
        if not verify_token(token):
            return Response(
                content='{"detail":"Invalid or expired token"}',
                status_code=status.HTTP_401_UNAUTHORIZED,
                media_type="application/json"
            )

        # Get user info from token
        user_id = get_user_id_from_token(token)
        email = get_email_from_token(token)

        if not user_id:
            return Response(
                content='{"detail":"Invalid token payload"}',
                status_code=status.HTTP_401_UNAUTHORIZED,
                media_type="application/json"
            )

        # Verify token with Supabase (optional but recommended for extra security)
        user_data, error = verify_supabase_token(token)
        if error:
            # If Supabase verification fails, still allow if our JWT is valid
            # This provides flexibility but you may want to enforce Supabase verification
            pass

        # Inject user context into request state
        request.state.user_id = user_id
        request.state.email = email or ""
        request.state.token = token

        return await call_next(request)

    def _is_public_endpoint(self, path: str) -> bool:
        """Check if endpoint is public (doesn't require authentication)"""
        public_paths = [
            "/",
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/auth/login",
            "/auth/register",
        ]
        return any(path.startswith(public) for public in public_paths)


# Dependency for FastAPI routes to get current user
def get_current_user(request: Request) -> dict:
    """
    Dependency function to get current authenticated user from request state
    
    Usage:
        @router.get("/protected")
        async def protected_route(user: dict = Depends(get_current_user)):
            user_id = user["user_id"]
    """
    if not hasattr(request.state, "user_id"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    
    return {
        "user_id": request.state.user_id,
        "email": getattr(request.state, "email", ""),
        "token": getattr(request.state, "token", ""),
    }


# Alternative: HTTPBearer security scheme for OpenAPI docs
security = HTTPBearer()
