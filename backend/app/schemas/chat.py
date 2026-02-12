"""Chat request and response schemas.

Non-stream (POST /chat/message) returns:
  {
    "conversation_id": "uuid",
    "message": {
      "id": "uuid",
      "conversation_id": "uuid",
      "role": "assistant",
      "content": "Full reply text.",
      "timestamp": "2026-02-12T12:00:00Z"
    }
  }

Stream (POST /chat/message/stream) returns Server-Sent Events (text/event-stream).
  Each event is a JSON line after "data: ":
  - {"type": "chunk", "content": "..."}  (one or more; append to UI for real-time effect)
  - {"type": "done", "conversation_id": "...", "message_id": "...", "message": {...}}
  - {"type": "error", "detail": "..."}   (on failure)
  Frontend: fetch(..., { body: JSON.stringify({message, conversation_id}) }) then read response.body
  with getReader() and parse "data: " lines as JSON.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SendMessageRequest(BaseModel):
    """Request body for sending a chat message."""

    message: str = Field(..., min_length=1, description="User message content")
    conversation_id: Optional[UUID] = Field(
        default=None,
        description="Conversation to reply in; omit to start a new conversation",
    )

    @field_validator("message", mode="before")
    @classmethod
    def strip_message(cls, v: str) -> str:
        return (v or "").strip()

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("Message cannot be empty")
        return v


class MessageResponse(BaseModel):
    """Single message in API responses."""

    id: UUID
    conversation_id: UUID
    role: str = Field(..., description="'user', 'assistant', or 'system'")
    content: str
    timestamp: datetime

    class Config:
        from_attributes = True


class SendMessageResponse(BaseModel):
    """Response after sending a message: the assistant reply and conversation info."""

    conversation_id: UUID
    message: MessageResponse = Field(..., description="The assistant's reply")


class ConversationResponse(BaseModel):
    """Conversation summary for list endpoints."""

    id: UUID
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    """List of conversations with optional pagination metadata."""

    conversations: list[ConversationResponse]
    total: Optional[int] = Field(default=None, description="Total count when available")


class MessageListResponse(BaseModel):
    """List of messages in a conversation."""

    messages: list[MessageResponse]
    conversation_id: UUID
