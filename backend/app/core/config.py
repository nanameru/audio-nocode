"""
Configuration settings for the Audio Processing Studio backend.
Based on pyannote.ai API documentation: https://docs.pyannote.ai/
"""

import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # pyannote.ai API Configuration
    pyannote_api_key: str = Field(..., description="pyannote.ai API key")
    pyannote_base_url: str = Field(
        default="https://api.pyannote.ai/v1",
        description="pyannote.ai API base URL"
    )
    
    # Server Configuration
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    debug: bool = Field(default=False, description="Debug mode")
    
    # File Upload Configuration
    upload_dir: str = Field(default="./uploads", description="Upload directory")
    temp_dir: str = Field(default="./temp", description="Temporary files directory")
    max_file_size: str = Field(default="100MB", description="Maximum file size")
    
    # Redis Configuration
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )
    
    # Webhook Configuration
    webhook_secret: str = Field(
        default="",
        description="Webhook secret for verification"
    )
    webhook_base_url: str = Field(
        default="http://localhost:8000",
        description="Base URL for webhooks"
    )
    
    # CORS Configuration
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        description="Allowed CORS origins"
    )
    
    # Rate Limiting (based on pyannote.ai limits)
    rate_limit_requests: int = Field(
        default=100,
        description="Rate limit: requests per minute"
    )
    rate_limit_window: int = Field(
        default=60,
        description="Rate limit window in seconds"
    )
    
    class Config:
        env_file = ".env.local"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings."""
    return settings
