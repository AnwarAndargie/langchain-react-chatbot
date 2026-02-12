"""Chat router: send message, list conversations, get messages."""

import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.middleware import get_current_user
from app.schemas.chat import (
    ConversationListResponse,
    ConversationResponse,
    MessageListResponse,
    MessageResponse,
    SendMessageRequest,
    SendMessageResponse,
)
from app.services import chat_service

router = APIRouter()


def _message_to_response(msg: dict) -> MessageResponse:
    """Map DB message dict to MessageResponse (handles snake_case from Supabase)."""
    return MessageResponse(
        id=msg["id"],
        conversation_id=msg["conversation_id"],
        role=msg["role"],
        content=msg["content"],
        timestamp=msg["timestamp"],
    )


def _conversation_to_response(conv: dict) -> ConversationResponse:
    """Map DB conversation dict to ConversationResponse."""
    return ConversationResponse(
        id=conv["id"],
        title=conv.get("title"),
        created_at=conv["created_at"],
        updated_at=conv["updated_at"],
    )


@router.post("/message", response_model=SendMessageResponse, status_code=status.HTTP_200_OK)
async def send_message(
    body: SendMessageRequest,
    user: dict = Depends(get_current_user),
):
    """
    Send a message and receive the assistant's reply.

    If `conversation_id` is omitted, a new conversation is created and its title
    is set from the first message. The returned message is the assistant's reply.
    """
    user_id = user["user_id"]
    access_token = user.get("token") or ""
    try:
        result = await chat_service.send_message(
            user_id=user_id,
            content=body.message,
            conversation_id=body.conversation_id,
            access_token=access_token,
        )
    except ValueError as e:
        msg = str(e).lower()
        if "access token is required" in msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
            ) from e
        if "not found" in msg or "access denied" in msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            ) from e
        if "content is required" in msg or "cannot be empty" in msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            ) from e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        ) from e

    return SendMessageResponse(
        conversation_id=result["conversation_id"],
        message=_message_to_response(result["message"]),
    )


@router.post("/message/stream")
async def send_message_stream(
    body: SendMessageRequest,
    user: dict = Depends(get_current_user),
):
    """
    Stream the assistant reply in real time (SSE). Use this for GPT-style typing effect.
    Events: `{ type: "chunk", content: "..." }` then `{ type: "done", conversation_id, message_id, message }`.
    """
    user_id = user["user_id"]
    access_token = user.get("token") or ""

    async def event_stream():
        try:
            async for event in chat_service.send_message_stream(
                user_id=user_id,
                content=body.message,
                conversation_id=body.conversation_id,
                access_token=access_token,
            ):
                # SSE: "data: " + JSON + "\n\n"
                payload = json.dumps(event, default=str)
                yield f"data: {payload}\n\n"
        except ValueError as e:
            err = str(e).lower()
            if "access token" in err:
                yield f"data: {json.dumps({'type': 'error', 'detail': 'Not authenticated'})}\n\n"
            elif "not found" in err or "access denied" in err:
                yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"
            else:
                yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user),
):
    """List the current user's conversations, newest first."""
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 100",
        )
    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="offset must be non-negative",
        )
    access_token = user.get("token") or ""
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    conversations = chat_service.list_conversations(
        user_id=user["user_id"],
        limit=limit,
        offset=offset,
        access_token=access_token,
    )
    return ConversationListResponse(
        conversations=[_conversation_to_response(c) for c in conversations],
    )


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=MessageListResponse,
)
async def get_messages(
    conversation_id: UUID,
    limit: int = 100,
    offset: int = 0,
    user: dict = Depends(get_current_user),
):
    """Get messages for a conversation. Returns 404 if not found or not owned by user."""
    if limit < 1 or limit > 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit must be between 1 and 200",
        )
    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="offset must be non-negative",
        )
    access_token = user.get("token") or ""
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    conv, messages = chat_service.get_messages(
        conversation_id=conversation_id,
        user_id=user["user_id"],
        limit=limit,
        offset=offset,
        access_token=access_token,
    )
    if conv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or access denied",
        )
    return MessageListResponse(
        messages=[_message_to_response(m) for m in messages],
        conversation_id=conversation_id,
    )
