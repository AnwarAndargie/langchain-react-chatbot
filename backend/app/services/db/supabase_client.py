"""Supabase client initialization and connection"""

from supabase import create_client, Client
from app.core import settings


def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance
    
    Returns:
        Supabase Client instance
    """
    return create_client(settings.supabase_url, settings.supabase_key)


def get_supabase_admin_client() -> Client:
    """
    Create and return a Supabase admin client with service role key
    Use this for operations that require elevated permissions
    
    Returns:
        Supabase Client instance with service role key
    """
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


# Global client instance (use get_supabase_client() for user-scoped operations)
supabase: Client = get_supabase_client()
