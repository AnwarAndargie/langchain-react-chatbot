"""Supabase client initialization and connection"""

from supabase import create_client, Client
from app.core import settings

_cached_client: Client | None = None
_cached_admin_client: Client | None = None


def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance (cached) using the anon key.
    Use get_supabase_client_for_user(token) for RLS when acting as a user.
    """
    global _cached_client
    if _cached_client is None:
        if not settings.supabase_url or not settings.supabase_key:
            raise RuntimeError("Supabase URL and key must be set")
        _cached_client = create_client(settings.supabase_url, settings.supabase_key)
    return _cached_client


def get_supabase_client_for_user(access_token: str) -> Client:
    """
    Return a Supabase client that sends the user's JWT so RLS sees auth.uid().
    Use this for conversation/message operations so RLS policies apply correctly.
    Not cached; creates a new client per call (token is per-request).
    """
    if not access_token or not settings.supabase_url or not settings.supabase_key:
        raise RuntimeError("Supabase URL, key, and user access_token must be set")
    client = create_client(settings.supabase_url, settings.supabase_key)
    # Use PostgREST client's auth() so the Bearer token is sent on every request (RLS)
    if hasattr(client, "postgrest") and hasattr(client.postgrest, "auth"):
        client.postgrest.auth(token=access_token)
    return client


def get_supabase_admin_client() -> Client:
    """
    Create and return a Supabase admin client with service role key (cached).
    Use this for operations that require elevated permissions.
    """
    global _cached_admin_client
    if _cached_admin_client is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise RuntimeError("Supabase URL and service role key must be set")
        _cached_admin_client = create_client(
            settings.supabase_url, settings.supabase_service_role_key
        )
    return _cached_admin_client
