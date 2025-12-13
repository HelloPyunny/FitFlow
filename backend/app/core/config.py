import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """Application settings"""
    
    # API Settings
    API_TITLE: str = "SmartFit Flow API"
    API_DESCRIPTION: str = "AI-based personalized fitness routine automation & performance prediction system"
    API_VERSION: str = "0.1.0"
    
    # CORS Settings
    CORS_ORIGINS: list = [
        "http://localhost:5173",  # Vite default
        "http://localhost:3000",  # React default
    ]
    
    # Database (loaded from .env)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    
    @classmethod
    def get_cors_origins(cls) -> list:
        """Get CORS origins from environment or default"""
        env_origins = os.getenv("CORS_ORIGINS", "")
        if env_origins:
            return [origin.strip() for origin in env_origins.split(",")]
        return cls.CORS_ORIGINS

settings = Settings()
