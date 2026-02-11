"""FastAPI application main module"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import settings
from app.middleware import AuthMiddleware
from app.routers import health

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="LangChain ReAct Chatbot API with Supabase, Google Trends MCP, and Tavily",
)

# CORS middleware (must be before auth middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication middleware (applies to all routes except public ones)
app.add_middleware(AuthMiddleware)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])

from app.routers import auth
app.include_router(auth.router, prefix="/auth", tags=["auth"])

# Chat router will be added in later tasks
# from app.routers import chat
# app.include_router(chat.router, prefix="/chat", tags=["chat"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": settings.app_name,
        "version": "1.0.0",
        "status": "running"
    }
