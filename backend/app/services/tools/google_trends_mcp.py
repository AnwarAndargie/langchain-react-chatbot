"""
Google Trends MCP tool integration.

Calls the Google News/Trends MCP server over HTTP (JSON-RPC), with timeout,
retries, and structured error handling. Exposes get_google_trends for the
LangChain agent and optional async usage.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import json
import logging
import uuid
from typing import Any, Optional

import httpx

from app.core import settings

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# MCP endpoint and protocol
# -----------------------------------------------------------------------------

def _mcp_endpoint() -> str:
    base = (settings.mcp_url or "").rstrip("/")
    return f"{base}/mcp" if base else ""


def _auth_headers() -> dict[str, str]:
    h: dict[str, str] = {"Content-Type": "application/json"}
    auth = (settings.mcp_auth_header or "").strip()
    if auth:
        h["Authorization"] = auth if auth.lower().startswith("bearer ") else f"Bearer {auth}"
    return h


# -----------------------------------------------------------------------------
# Tool metadata for LangChain agent
# -----------------------------------------------------------------------------

LANGCHAIN_TOOL_NAME = "google_trends"
LANGCHAIN_TOOL_DESCRIPTION = (
    "Get trending search terms from Google Trends for a country, or related news. "
    "Use this when the user asks about trending topics, what is popular in a region, "
    "or Google Trends data. Input can be a country code (e.g. US, GB, IN) or a short "
    "description like 'trends in US'."
)

# -----------------------------------------------------------------------------
# JSON-RPC helpers
# -----------------------------------------------------------------------------


def _jsonrpc_request(method: str, params: Optional[dict[str, Any]] = None) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": str(uuid.uuid4()),
        "method": method,
        "params": params or {},
    }


def _parse_tool_result(response_data: dict[str, Any]) -> Any:
    """Extract result content from MCP tools/call response."""
    result = response_data.get("result")
    if result is None:
        return None
    # MCP tool result often has "content": [{"type": "text", "text": "..."}]
    content = result.get("content")
    if isinstance(content, list) and content:
        first = content[0]
        if isinstance(first, dict) and first.get("type") == "text":
            text = first.get("text")
            if isinstance(text, str):
                try:
                    return json.loads(text)
                except json.JSONDecodeError:
                    return text
            return text
    return result


# -----------------------------------------------------------------------------
# MCP client (HTTP JSON-RPC)
# -----------------------------------------------------------------------------


async def _call_mcp_tool_async(
    tool_name: str,
    arguments: dict[str, Any],
    *,
    timeout_seconds: Optional[int] = None,
    retries: Optional[int] = None,
) -> dict[str, Any]:
    """
    Call a single tool on the Google Trends MCP server over HTTP.

    Args:
        tool_name: MCP tool name (e.g. "get_trending_terms").
        arguments: Tool arguments as a dict.
        timeout_seconds: Request timeout (default from settings).
        retries: Number of retries on connection/timeout (default from settings).

    Returns:
        Dict with "data" (tool result) and "error" (str or None).
    """
    url = _mcp_endpoint()
    if not url:
        return {
            "data": None,
            "error": "MCP URL is not configured. Set MCP_URL.",
        }

    timeout = timeout_seconds if timeout_seconds is not None else settings.mcp_timeout
    max_retries = retries if retries is not None else max(0, settings.mcp_max_retries)
    payload = _jsonrpc_request("tools/call", {"name": tool_name, "arguments": arguments})
    headers = _auth_headers()

    last_exc: Optional[Exception] = None
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=float(timeout)) as client:
                resp = await client.post(url, json=payload, headers=headers)
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout) as e:
            last_exc = e
            logger.warning("MCP connection attempt %s failed: %s", attempt + 1, str(e)[:200])
            if attempt < max_retries:
                await asyncio.sleep(0.5 * (attempt + 1))
            continue
        except Exception as e:
            last_exc = e
            logger.warning("MCP request failed: %s", str(e)[:200])
            return {
                "data": None,
                "error": "Google Trends service error. Please try again later.",
            }

        if resp.status_code != 200:
            logger.warning("MCP returned status %s", resp.status_code)
            return {
                "data": None,
                "error": "Google Trends service is unavailable. Please try again later.",
            }

        try:
            body = resp.json()
        except Exception as e:
            logger.warning("MCP response not JSON: %s", e)
            return {"data": None, "error": "Invalid response from Google Trends service."}

        if "error" in body and body["error"]:
            err = body["error"]
            msg = err.get("message", "Unknown MCP error")
            logger.warning("MCP error: %s", msg[:200])
            if "401" in str(msg) or "unauthorized" in str(msg).lower():
                return {"data": None, "error": "Google Trends service authentication failed."}
            return {"data": None, "error": "Google Trends request failed. Please try again."}

        data = _parse_tool_result(body)
        return {"data": data, "error": None}

    return {
        "data": None,
        "error": "Google Trends service is unreachable. Please try again later.",
    }


# -----------------------------------------------------------------------------
# Public API
# -----------------------------------------------------------------------------


def get_google_trends(
    geo: str = "US",
    full_data: bool = False,
    *,
    timeout_seconds: Optional[int] = None,
) -> dict[str, Any]:
    """
    Fetch trending terms from Google Trends via the MCP server (sync).

    Args:
        geo: Country code (e.g. "US", "GB", "IN"). Default "US".
        full_data: If True, include full trend data and related news; if False,
            returns keyword and volume only. Default False for faster response.
        timeout_seconds: Override default MCP timeout.

    Returns:
        Dict with:
            - "trends": list of trend items (keyword, volume, and optionally more).
            - "error": None on success, or an error message string.
    """
    loop: Optional[asyncio.AbstractEventLoop] = None
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        pass

    if loop is not None:
        # Called from async context: run in a thread to avoid nesting event loops
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            fut = pool.submit(
                asyncio.run,
                get_google_trends_async(geo=geo, full_data=full_data, timeout_seconds=timeout_seconds),
            )
            return fut.result(timeout=(timeout_seconds or settings.mcp_timeout) + 10)

    return asyncio.run(
        get_google_trends_async(geo=geo, full_data=full_data, timeout_seconds=timeout_seconds),
    )


async def get_google_trends_async(
    geo: str = "US",
    full_data: bool = False,
    *,
    timeout_seconds: Optional[int] = None,
) -> dict[str, Any]:
    """
    Fetch trending terms from Google Trends via the MCP server (async).

    Same semantics as get_google_trends; use this from async code.
    """
    out = await _call_mcp_tool_async(
        "get_trending_terms",
        {"geo": (geo or "US").strip() or "US", "full_data": bool(full_data)},
        timeout_seconds=timeout_seconds,
    )

    if out.get("error"):
        return {"trends": [], "error": out["error"]}

    data = out.get("data")
    if data is None:
        return {"trends": [], "error": "No data from Google Trends."}

    # Normalize: MCP may return list of dicts or a single object
    if isinstance(data, list):
        trends = data
    elif isinstance(data, dict):
        trends = data.get("trends", data.get("results", [data]))
        if not isinstance(trends, list):
            trends = [data]
    else:
        trends = []

    return {"trends": trends, "error": None}


def is_mcp_available() -> bool:
    """Return True if MCP base URL is configured."""
    return bool((settings.mcp_url or "").strip())
