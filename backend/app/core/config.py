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

    # Supabase Configuration
    supabase_url: str
    supabase_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # Google Gemini Configuration
    gemini_api_key: str
    gemini_model: str = "gemini-1.5-flash"

    # Tavily API Configuration
    tavily_api_key: str

    # Google Trends MCP Configuration
    mcp_url: str = "http://google-trends-mcp:8080"
    mcp_timeout: int = 30

    # JWT Configuration
    jwt_secret: str
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
