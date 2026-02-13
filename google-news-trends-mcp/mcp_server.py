from contextlib import asynccontextmanager

from fastmcp import FastMCP
from starlette.middleware import Middleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from security.verification import verify_mcp_jwt

from auth import UnauthorizedError, check_authorization
from tools import BrowserManager, register_tools


class AuthorizationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Skip JWT verification when not configured (e.g. backend and MCP on same private network)
        try:
            from load_var import load_var
            if not (getattr(load_var, "_MCP_JWT_ISSUER", None) or "").strip():
                return await call_next(request)
        except Exception:
            pass
        try:
            verify_mcp_jwt(request.headers)
        except UnauthorizedError as exc:
            return JSONResponse({"error": {"message": str(exc)}}, status_code=401)
        except PermissionError as exc:
            return JSONResponse({"error": {"message": str(exc)}}, status_code=401)
        return await call_next(request)


@asynccontextmanager
async def lifespan(_: FastMCP):
    async with BrowserManager():
        yield


mcp = FastMCP(
    name="google-news-trends",
    instructions="This server provides tools to search, analyze, and summarize Google News articles and Google Trends",
    lifespan=lifespan,
    on_duplicate_tools="replace",
)

register_tools(mcp)

mcp_http_app = mcp.http_app(
    path="/",
    middleware=[Middleware(AuthorizationMiddleware)],
    stateless_http=False,
)
