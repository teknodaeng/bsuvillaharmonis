import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "BSU Villa Harmonis"
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = "supersecretkeyforbsuvillaharmonis2026changethisinprod"
    
    # Turso Database settings
    # If DATABASE_URL is set (e.g. libsql://... or https://...), it connects to Turso
    # Otherwise it uses local SQLite db (bsuvh.db)
    DATABASE_URL: str = ""
    TURSO_AUTH_TOKEN: str = ""
    LOCAL_DB_PATH: str = "bsuvh.db"
    
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    CORS_ORIGINS: Union[List[str], str] = ["*"]
    
    BANK_NAME: str = "BSU Villa Harmonis"
    RECEIPT_FOOTER: str = "Terima kasih telah menjaga lingkungan bersama Bank Sampah Villa Harmonis."

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )


settings = Settings()
