"""Health check router"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.services.db.supabase_client import get_supabase_client
from app.core import settings

router = APIRouter()


@router.get("")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint with dependency status
    
    Returns:
        Dictionary with health status and dependency checks
    """
    health_status = {
        "status": "healthy",
        "service": "LangChain Chatbot API",
        "version": "1.0.0",
        "dependencies": {}
    }

    # Check Supabase connection
    try:
        client = get_supabase_client()
        # Simple query to test connection
        result = client.table("conversations").select("id").limit(1).execute()
        health_status["dependencies"]["supabase"] = {
            "status": "connected",
            "url": settings.supabase_url
        }
    except Exception as e:
        health_status["dependencies"]["supabase"] = {
            "status": "disconnected",
            "error": str(e)
        }
        health_status["status"] = "degraded"

    # Check MCP service (Google Trends)
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.mcp_url}/healthz",
                follow_redirects=True
            )
            if response.status_code == 200:
                health_status["dependencies"]["mcp"] = {
                    "status": "connected",
                    "url": settings.mcp_url
                }
            else:
                health_status["dependencies"]["mcp"] = {
                    "status": "unavailable",
                    "url": settings.mcp_url,
                    "status_code": response.status_code
                }
                health_status["status"] = "degraded"
    except Exception as e:
        health_status["dependencies"]["mcp"] = {
            "status": "disconnected",
            "url": settings.mcp_url,
            "error": str(e)
        }
        health_status["status"] = "degraded"

    # Check configuration
    config_status = {
        "supabase_configured": bool(settings.supabase_url and settings.supabase_key),
        "gemini_configured": bool(settings.gemini_api_key),
        "tavily_configured": bool(settings.tavily_api_key),
    }
    health_status["configuration"] = config_status

    # If critical dependencies are missing, mark as unhealthy
    if not config_status["supabase_configured"] or not config_status["gemini_configured"]:
        health_status["status"] = "unhealthy"

    return health_status
