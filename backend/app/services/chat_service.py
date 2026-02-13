"""
Chat service: orchestrates conversations, messages, and the agent.

Provides a single place for send-message and history logic so the router stays thin
and logic is reusable and testable.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Callable, Optional, TypeVar
from uuid import UUID

import httpx

from app.services.db import Conversation, Message
from app.services.db.supabase_client import get_supabase_client_for_user
from app.services.agent import invoke_agent_async, stream_agent_async

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Connection errors that may be transient (Supabase/PostgREST "Server disconnected").
def _is_connection_error(exc: BaseException) -> bool:
    if isinstance(exc, (httpx.RemoteProtocolError, httpx.ConnectError, httpx.ConnectTimeout)):
        return True
    try:
        import httpcore
        if isinstance(exc, httpcore.RemoteProtocolError):
            return True
    except ImportError:
        pass
    if exc.__class__.__name__ == "RemoteProtocolError" and "httpcore" in (exc.__class__.__module__ or ""):
        return True
    if isinstance(exc, OSError) and "disconnected" in str(exc).lower():
        return True
    return False


def _with_retry_on_disconnect(fn: Callable[[], T], max_attempts: int = 2) -> T:
    """Run fn(); on connection/disconnect errors, retry once after a short delay."""
    last: Optional[BaseException] = None
    for attempt in range(max_attempts):
        try:
            return fn()
        except Exception as e:
            last = e
            if _is_connection_error(e) and attempt < max_attempts - 1:
                logger.warning("Supabase connection error (attempt %s), retrying: %s", attempt + 1, str(e)[:200])
                time.sleep(0.3)
                continue
            raise
    assert last is not None
    raise last

# Default number of recent messages to pass to the agent for context
DEFAULT_AGENT_HISTORY_LIMIT = 20


def _parse_uuid(value: Any) -> Optional[UUID]:
    """Parse a string or UUID to UUID; return None if invalid."""
    if value is None:
        return None
    if isinstance(value, UUID):
        return value
    try:
        return UUID(str(value))
    except (ValueError, TypeError):
        return None


async def send_message(
    user_id: UUID,
    content: str,
    conversation_id: Optional[UUID] = None,
    access_token: Optional[str] = None,
) -> dict[str, Any]:
    """
    Process a user message: create or use a conversation, persist the user message,
    run the agent with history, persist the assistant reply, and optionally set
    conversation title from the first message. Uses access_token for RLS.

    Args:
        user_id: Authenticated user's UUID.
        content: User message text (non-empty, stripped).
        conversation_id: Existing conversation to reply in, or None to create one.
        access_token: Supabase access token (required so RLS sees auth.uid()).

    Returns:
        Dict with:
          - conversation_id: UUID
          - message: dict with id, conversation_id, role, content, timestamp
          - conversation_created: bool (true if a new conversation was created)

    Raises:
        ValueError: If conversation_id is given but not found or not owned by user.
    """
    if not access_token:
        raise ValueError("Access token is required for RLS")
    user_id = _parse_uuid(user_id) or user_id
    content = (content or "").strip()
    if not content:
        raise ValueError("Message content is required")

    client = get_supabase_client_for_user(access_token)
    conv_repo = Conversation(client=client)
    msg_repo = Message(client=client)

    if conversation_id is not None:
        conv = conv_repo.get_by_id(conversation_id, user_id)
        if not conv:
            raise ValueError("Conversation not found or access denied")
        conv_id = UUID(conv["id"])
        conversation_created = False
    else:
        new_conv = conv_repo.create(user_id, title=None)
        if not new_conv:
            raise ValueError("Failed to create conversation")
        conv_id = UUID(new_conv["id"])
        conversation_created = True

    # Persist user message
    user_msg = msg_repo.create(
        conversation_id=conv_id,
        user_id=user_id,
        role="user",
        content=content,
    )
    if not user_msg:
        raise ValueError("Failed to save user message")

    # Load recent history for agent (oldest first)
    history = msg_repo.get_conversation_history_for_agent(
        conversation_id=conv_id,
        user_id=user_id,
        max_messages=DEFAULT_AGENT_HISTORY_LIMIT,
    )

    # Run agent (async)
    assistant_content = await invoke_agent_async(content, history)

    # Persist assistant message
    assistant_msg = msg_repo.create(
        conversation_id=conv_id,
        user_id=user_id,
        role="assistant",
        content=assistant_content,
    )
    if not assistant_msg:
        logger.error("Failed to save assistant message for conversation %s", conv_id)
        raise ValueError("Failed to save assistant reply")

    # Optionally set conversation title from first user message (when new conversation)
    if conversation_created:
        title = content[:200] + ("..." if len(content) > 200 else "")
        conv_repo.update(conv_id, user_id, title=title)

    return {
        "conversation_id": conv_id,
        "message": assistant_msg,
        "conversation_created": conversation_created,
    }


async def send_message_stream(
    user_id: UUID,
    content: str,
    conversation_id: Optional[UUID] = None,
    access_token: Optional[str] = None,
):
    """
    Same as send_message but streams the assistant reply chunk-by-chunk.
    Yields dicts: {"type": "chunk", "content": "..."} then {"type": "done", "conversation_id", "message_id", "message"}.
    """
    if not access_token:
        raise ValueError("Access token is required for RLS")
    user_id = _parse_uuid(user_id) or user_id
    content = (content or "").strip()
    if not content:
        raise ValueError("Message content is required")

    client = get_supabase_client_for_user(access_token)
    conv_repo = Conversation(client=client)
    msg_repo = Message(client=client)

    if conversation_id is not None:
        conv = conv_repo.get_by_id(conversation_id, user_id)
        if not conv:
            raise ValueError("Conversation not found or access denied")
        conv_id = UUID(conv["id"])
        conversation_created = False
    else:
        new_conv = conv_repo.create(user_id, title=None)
        if not new_conv:
            raise ValueError("Failed to create conversation")
        conv_id = UUID(new_conv["id"])
        conversation_created = True

    user_msg = msg_repo.create(
        conversation_id=conv_id,
        user_id=user_id,
        role="user",
        content=content,
    )
    if not user_msg:
        raise ValueError("Failed to save user message")

    history = msg_repo.get_conversation_history_for_agent(
        conversation_id=conv_id,
        user_id=user_id,
        max_messages=DEFAULT_AGENT_HISTORY_LIMIT,
    )

    full_content_parts: list[str] = []
    tools_used: list[str] = []
    try:
        async for event in stream_agent_async(content, history):
            if event["type"] == "token":
                text = event["content"]
                if text:
                    full_content_parts.append(text)
                    yield {"type": "chunk", "content": text}
            elif event["type"] == "tool_start":
                tool_name = event.get("tool") or ""
                if tool_name and tool_name not in tools_used:
                    tools_used.append(tool_name)
                yield {"type": "tool_start", "tool": event["tool"]}
    except Exception as e:
        logger.exception("Stream failed: %s", e)
        full_content_parts = ["Something went wrong while answering. Please try again."]
        yield {"type": "chunk", "content": full_content_parts[-1]}

    assistant_content = "".join(full_content_parts).strip()
    metadata: dict[str, Any] = {}
    if tools_used:
        metadata["tools_used"] = tools_used
    assistant_msg = msg_repo.create(
        conversation_id=conv_id,
        user_id=user_id,
        role="assistant",
        content=assistant_content or "(No response)",
        metadata=metadata if metadata else None,
    )
    if conversation_created:
        title = content[:200] + ("..." if len(content) > 200 else "")
        conv_repo.update(conv_id, user_id, title=title)

    # Include tools_used in message for frontend (and ensure it's on the returned object)
    if assistant_msg and tools_used:
        assistant_msg = dict(assistant_msg)
        if assistant_msg.get("metadata") is None:
            assistant_msg["metadata"] = {}
        assistant_msg["metadata"] = dict(assistant_msg["metadata"])
        assistant_msg["metadata"]["tools_used"] = tools_used

    yield {
        "type": "done",
        "conversation_id": str(conv_id),
        "message_id": str(assistant_msg["id"]) if assistant_msg else None,
        "message": assistant_msg,
    }


def list_conversations(
    user_id: UUID,
    limit: int = 50,
    offset: int = 0,
    access_token: Optional[str] = None,
) -> list[dict[str, Any]]:
    """
    List conversations for a user, newest first. Uses access_token for RLS.

    Args:
        user_id: Authenticated user's UUID.
        limit: Max number of conversations to return.
        offset: Number to skip (for pagination).
        access_token: Supabase access token (required so RLS sees auth.uid()).

    Returns:
        List of conversation dicts (id, title, created_at, updated_at, etc.).
    """
    if not access_token:
        raise ValueError("Access token is required for RLS")
    user_id = _parse_uuid(user_id) or user_id
    client = get_supabase_client_for_user(access_token)

    def _fetch() -> list[dict[str, Any]]:
        return Conversation(client=client).get_by_user_id(user_id, limit=limit, offset=offset)

    return _with_retry_on_disconnect(_fetch)


def get_messages(
    conversation_id: UUID,
    user_id: UUID,
    limit: int = 100,
    offset: int = 0,
    access_token: Optional[str] = None,
) -> tuple[Optional[dict], list[dict[str, Any]]]:
    """
    Get messages for a conversation. Ensures the conversation belongs to the user. Uses access_token for RLS.

    Args:
        conversation_id: Conversation UUID.
        user_id: Authenticated user's UUID.
        limit: Max messages to return.
        offset: Number to skip (for pagination).
        access_token: Supabase access token (required so RLS sees auth.uid()).

    Returns:
        (conversation_dict_or_None, list_of_messages).
        If the conversation is not found or not owned by user, first element is None
        and the list is empty.
    """
    if not access_token:
        raise ValueError("Access token is required for RLS")
    user_id = _parse_uuid(user_id) or user_id
    conv_id = _parse_uuid(conversation_id) or conversation_id
    client = get_supabase_client_for_user(access_token)
    conv_repo = Conversation(client=client)
    msg_repo = Message(client=client)

    def _fetch_conv() -> Optional[dict]:
        return conv_repo.get_by_id(conv_id, user_id)

    conv = _with_retry_on_disconnect(_fetch_conv)
    if not conv:
        return None, []

    def _fetch_messages() -> list[dict[str, Any]]:
        return msg_repo.get_by_conversation_id(
            conversation_id=conv_id,
            user_id=user_id,
            limit=limit,
            offset=offset,
        )

    messages = _with_retry_on_disconnect(_fetch_messages)
    return conv, messages
