"""
Tavily web search tool integration.

Provides a reusable client and a search function suitable for the LangChain agent,
with structured results, timeout, and error handling. API keys are never logged or
exposed in error messages.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from app.core import settings

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# Tool metadata for LangChain agent registration
# -----------------------------------------------------------------------------

LANGCHAIN_TOOL_NAME = "tavily_web_search"
LANGCHAIN_TOOL_DESCRIPTION = (
    "Search the web for current information. Use this when the user asks about "
    "recent events, facts, documentation, or anything that might need up-to-date "
    "information from the internet. Input should be a clear search query string."
)

# -----------------------------------------------------------------------------
# Structured result types (for type safety and consistent API)
# -----------------------------------------------------------------------------


def _normalize_result(item: dict[str, Any]) -> dict[str, Any]:
    """Normalize a single Tavily result item to a consistent shape."""
    return {
        "title": item.get("title") or "",
        "url": item.get("url") or "",
        "content": item.get("content") or "",
        "score": float(item.get("score", 0.0)),
    }


def _build_success_payload(
    query: str,
    raw_response: dict[str, Any],
    max_results: int,
) -> dict[str, Any]:
    """Build a structured success response from Tavily API response."""
    results = raw_response.get("results")
    if not isinstance(results, list):
        results = []
    items = [_normalize_result(r) for r in results[:max_results]]
    answer = raw_response.get("answer")
    return {
        "query": query,
        "results": items,
        "answer": answer if isinstance(answer, str) else None,
        "error": None,
    }


def _build_error_payload(query: str, message: str) -> dict[str, Any]:
    """Build a structured error response (no API key or exception details)."""
    return {
        "query": query,
        "results": [],
        "answer": None,
        "error": message,
    }


# -----------------------------------------------------------------------------
# Client and public API
# -----------------------------------------------------------------------------


class TavilySearchError(Exception):
    """Raised when Tavily search fails (config or API error)."""

    def __init__(self, message: str, *, query: str = "") -> None:
        self.query = query
        super().__init__(message)


def search_tavily(
    query: str,
    *,
    max_results: Optional[int] = None,
    search_depth: Optional[str] = None,
    include_answer: bool = False,
) -> dict[str, Any]:
    """
    Run a Tavily web search and return a structured result.

    Args:
        query: Search query string.
        max_results: Maximum number of results (default from settings).
        search_depth: "basic" or "advanced" (default from settings).
        include_answer: Whether to request an LLM-generated answer in the response.

    Returns:
        Dict with keys:
            - query: The search query.
            - results: List of {"title", "url", "content", "score"}.
            - answer: Optional Tavily-generated answer if requested.
            - error: None on success, or an error message string on failure.
    """
    if not query or not str(query).strip():
        return _build_error_payload(query or "", "Search query cannot be empty.")

    api_key = (settings.tavily_api_key or "").strip()
    if not api_key:
        logger.warning("Tavily search called without TAVILY_API_KEY configured")
        return _build_error_payload(
            query,
            "Web search is not configured. Please set TAVILY_API_KEY.",
        )

    max_results = max_results if max_results is not None else settings.tavily_max_results
    search_depth = search_depth or settings.tavily_search_depth

    try:
        from tavily import TavilyClient
    except ImportError as e:
        logger.exception("Tavily SDK not available")
        return _build_error_payload(
            query,
            "Web search dependency is not available.",
        )

    _depth = search_depth if search_depth in ("basic", "advanced", "fast", "ultra-fast") else "basic"
    try:
        client = TavilyClient(api_key=api_key)
        raw = client.search(
            query=str(query).strip(),
            max_results=min(max(1, max_results), 20),
            search_depth=_depth,
            include_answer=include_answer,
        )
    except Exception as e:
        msg = str(e).strip()
        if "api_key" in msg.lower() or "auth" in msg.lower() or "401" in msg:
            logger.warning("Tavily API authentication failed")
            user_message = "Web search authentication failed. Check TAVILY_API_KEY."
        elif "timeout" in msg.lower() or "timed out" in msg.lower():
            logger.warning("Tavily request timed out: %s", msg[:200])
            user_message = "Web search timed out. Please try again."
        else:
            logger.warning("Tavily search failed: %s", msg[:200])
            user_message = "Web search failed. Please try again later."
        return _build_error_payload(query, user_message)

    if not raw:
        return _build_error_payload(query, "Web search returned no data.")

    return _build_success_payload(query, raw, max_results)


def is_tavily_available() -> bool:
    """Return True if Tavily is configured and can be used."""
    return bool((settings.tavily_api_key or "").strip())
