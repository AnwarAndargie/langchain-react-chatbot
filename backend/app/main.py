"""FastAPI application main module"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.core import settings
from app.middleware import AuthMiddleware
from app.routers import health

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="LangChain ReAct Chatbot API with Supabase, Google Trends MCP, and Tavily",
)


def custom_openapi():
    """Add Bearer JWT security scheme so Swagger UI shows the Authorize button."""
    if app.openapi_schema is not None:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    openapi_schema.setdefault("components", {}).setdefault("securitySchemes", {})[
        "BearerAuth"
    ] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Enter your JWT access token (from /auth/login or /auth/register)",
    }
    # Optional: mark that the API supports Bearer auth (Authorize button will send it globally)
    openapi_schema.setdefault("security", []).append({"BearerAuth": []})
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

# Authentication middleware (inner: runs after CORS)
app.add_middleware(AuthMiddleware)

# CORS middleware (outer: runs first so all responses get CORS headers, including 401)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])

from app.routers import auth, chat

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(chat.router, prefix="/chat", tags=["chat"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": settings.app_name,
        "version": "1.0.0",
        "status": "running"
    }
