"""Application configuration using Pydantic Settings"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application Configuration
    app_name: str = "LangChain Chatbot API"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000

    # CORS Configuration
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Supabase Configuration (default empty so app starts without .env; required for auth)
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Google Gemini Configuration (default empty; required for chat agent)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    # Tavily API Configuration (default empty; required for web search tool)
    tavily_api_key: str = ""
    tavily_timeout_seconds: int = 30
    tavily_max_results: int = 5
    tavily_search_depth: str = "basic"  # basic | advanced (advanced uses more credits)

    # Google Trends MCP Configuration
    mcp_url: str = "http://google-trends-mcp:8080"
    mcp_timeout: int = 30
    mcp_max_retries: int = 2
    # Optional: Bearer token for MCP server auth (e.g. "Bearer <token>"). Empty = no header.
    mcp_auth_header: str = ""

    # JWT Configuration (default empty; required for auth)
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # Agent Configuration
    agent_max_iterations: int = 10
    agent_timeout_seconds: int = 60

    # Logging
    log_level: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        """Convert CORS origins string to list"""
        return [origin.strip() for origin in self.cors_origins.split(",")]


# Global settings instance
settings = Settings()
