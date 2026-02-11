"""Message CRUD operations"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from supabase import Client

from app.services.db.supabase_client import get_supabase_client


class Message:
    """Message data model and operations"""

    def __init__(self, client: Optional[Client] = None):
        self.client = client or get_supabase_client()

    def create(
        self,
        conversation_id: UUID,
        user_id: UUID,
        role: str,
        content: str,
        tool_calls: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> dict:
        """
        Create a new message
        
        Args:
            conversation_id: UUID of the conversation
            user_id: UUID of the user
            role: Message role ('user', 'assistant', 'system')
            content: Message content
            tool_calls: Optional tool call information
            metadata: Optional metadata dictionary
            
        Returns:
            Created message dictionary
        """
        data = {
            "conversation_id": str(conversation_id),
            "user_id": str(user_id),
            "role": role,
            "content": content,
        }
        
        if tool_calls is not None:
            data["tool_calls"] = tool_calls
        if metadata is not None:
            data["metadata"] = metadata
        
        result = self.client.table("messages").insert(data).execute()
        return result.data[0] if result.data else None

    def get_by_conversation_id(
        self,
        conversation_id: UUID,
        user_id: UUID,
        limit: int = 100,
        offset: int = 0
    ) -> List[dict]:
        """
        Get all messages for a conversation (ensures user ownership)
        
        Args:
            conversation_id: UUID of the conversation
            user_id: UUID of the user (for authorization)
            limit: Maximum number of messages to return
            offset: Number of messages to skip
            
        Returns:
            List of message dictionaries ordered by timestamp
        """
        # Verify the conversation belongs to the user via join
        result = (
            self.client.table("messages")
            .select("*, conversations!inner(user_id)")
            .eq("conversation_id", str(conversation_id))
            .eq("conversations.user_id", str(user_id))
            .order("timestamp", desc=False)  # Oldest first for conversation flow
            .limit(limit)
            .offset(offset)
            .execute()
        )
        # Remove the nested conversations data from response
        messages = result.data or []
        for msg in messages:
            if "conversations" in msg:
                del msg["conversations"]
        return messages

    def get_recent_messages(
        self,
        conversation_id: UUID,
        user_id: UUID,
        count: int = 10
    ) -> List[dict]:
        """
        Get recent messages for agent context (most recent first)
        
        Args:
            conversation_id: UUID of the conversation
            user_id: UUID of the user (for authorization)
            count: Number of recent messages to return
            
        Returns:
            List of message dictionaries ordered by timestamp (newest first)
        """
        # Verify the conversation belongs to the user via join
        result = (
            self.client.table("messages")
            .select("*, conversations!inner(user_id)")
            .eq("conversation_id", str(conversation_id))
            .eq("conversations.user_id", str(user_id))
            .order("timestamp", desc=True)  # Newest first
            .limit(count)
            .execute()
        )
        # Remove the nested conversations data from response
        messages = result.data or []
        for msg in messages:
            if "conversations" in msg:
                del msg["conversations"]
        return messages

    def get_by_id(
        self,
        message_id: UUID,
        user_id: UUID
    ) -> Optional[dict]:
        """
        Get a message by ID (ensures user ownership via conversation)
        
        Args:
            message_id: UUID of the message
            user_id: UUID of the user (for authorization)
            
        Returns:
            Message dictionary or None if not found
        """
        result = (
            self.client.table("messages")
            .select("*, conversations!inner(user_id)")
            .eq("id", str(message_id))
            .eq("conversations.user_id", str(user_id))
            .execute()
        )
        return result.data[0] if result.data else None

    def update(
        self,
        message_id: UUID,
        user_id: UUID,
        content: Optional[str] = None,
        tool_calls: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[dict]:
        """
        Update a message
        
        Args:
            message_id: UUID of the message
            user_id: UUID of the user (for authorization)
            content: New message content
            tool_calls: Updated tool call information
            metadata: Updated metadata dictionary
            
        Returns:
            Updated message dictionary or None if not found
        """
        data = {}
        if content is not None:
            data["content"] = content
        if tool_calls is not None:
            data["tool_calls"] = tool_calls
        if metadata is not None:
            data["metadata"] = metadata
        
        if not data:
            return self.get_by_id(message_id, user_id)
        
        # Verify ownership first
        message = self.get_by_id(message_id, user_id)
        if not message:
            return None
        
        result = (
            self.client.table("messages")
            .update(data)
            .eq("id", str(message_id))
            .execute()
        )
        return result.data[0] if result.data else None

    def delete(
        self,
        message_id: UUID,
        user_id: UUID
    ) -> bool:
        """
        Delete a message
        
        Args:
            message_id: UUID of the message
            user_id: UUID of the user (for authorization)
            
        Returns:
            True if deleted, False otherwise
        """
        # Verify ownership first
        message = self.get_by_id(message_id, user_id)
        if not message:
            return False
        
        result = (
            self.client.table("messages")
            .delete()
            .eq("id", str(message_id))
            .execute()
        )
        return len(result.data) > 0 if result.data else False

    def get_conversation_history_for_agent(
        self,
        conversation_id: UUID,
        user_id: UUID,
        max_messages: int = 20
    ) -> List[dict]:
        """
        Get conversation history formatted for LangChain agent context
        Returns messages in chronological order (oldest first)
        
        Args:
            conversation_id: UUID of the conversation
            user_id: UUID of the user (for authorization)
            max_messages: Maximum number of messages to return
            
        Returns:
            List of message dictionaries with role and content
        """
        messages = self.get_by_conversation_id(
            conversation_id=conversation_id,
            user_id=user_id,
            limit=max_messages
        )
        
        # Format for agent context (only role and content)
        return [
            {
                "role": msg["role"],
                "content": msg["content"]
            }
            for msg in messages
        ]
