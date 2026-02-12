"""Conversation CRUD operations"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime
from supabase import Client

from app.services.db.supabase_client import get_supabase_client


class Conversation:
    """Conversation data model and operations. Pass a user-scoped client for RLS."""

    def __init__(self, client: Optional[Client] = None):
        self.client = client or get_supabase_client()

    def create(
        self,
        user_id: UUID,
        title: Optional[str] = None
    ) -> dict:
        """
        Create a new conversation
        
        Args:
            user_id: UUID of the user
            title: Optional conversation title
            
        Returns:
            Created conversation dictionary
        """
        data = {
            "user_id": str(user_id),
            "title": title
        }
        
        result = self.client.table("conversations").insert(data).execute()
        return result.data[0] if result.data else None

    def get_by_id(
        self,
        conversation_id: UUID,
        user_id: UUID
    ) -> Optional[dict]:
        """
        Get a conversation by ID (ensures user ownership)
        
        Args:
            conversation_id: UUID of the conversation
            user_id: UUID of the user (for authorization)
            
        Returns:
            Conversation dictionary or None if not found
        """
        result = (
            self.client.table("conversations")
            .select("*")
            .eq("id", str(conversation_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        return result.data[0] if result.data else None

    def get_by_user_id(
        self,
        user_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[dict]:
        """
        Get all conversations for a user
        
        Args:
            user_id: UUID of the user
            limit: Maximum number of conversations to return
            offset: Number of conversations to skip
            
        Returns:
            List of conversation dictionaries
        """
        result = (
            self.client.table("conversations")
            .select("*")
            .eq("user_id", str(user_id))
            .order("created_at", desc=True)
            .limit(limit)
            .offset(offset)
            .execute()
        )
        return result.data or []

    def update(
        self,
        conversation_id: UUID,
        user_id: UUID,
        title: Optional[str] = None
    ) -> Optional[dict]:
        """
        Update a conversation
        
        Args:
            conversation_id: UUID of the conversation
            user_id: UUID of the user (for authorization)
            title: New title for the conversation
            
        Returns:
            Updated conversation dictionary or None if not found
        """
        data = {}
        if title is not None:
            data["title"] = title
        
        if not data:
            return self.get_by_id(conversation_id, user_id)
        
        result = (
            self.client.table("conversations")
            .update(data)
            .eq("id", str(conversation_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        return result.data[0] if result.data else None

    def delete(
        self,
        conversation_id: UUID,
        user_id: UUID
    ) -> bool:
        """
        Delete a conversation (cascades to messages via foreign key)
        
        Args:
            conversation_id: UUID of the conversation
            user_id: UUID of the user (for authorization)
            
        Returns:
            True if deleted, False otherwise
        """
        result = (
            self.client.table("conversations")
            .delete()
            .eq("id", str(conversation_id))
            .eq("user_id", str(user_id))
            .execute()
        )
        return len(result.data) > 0 if result.data else False
