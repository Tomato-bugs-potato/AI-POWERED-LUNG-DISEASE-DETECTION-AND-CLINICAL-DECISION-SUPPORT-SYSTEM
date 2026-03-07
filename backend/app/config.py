from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Lung Disease Detection API"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # OTP
    OTP_EXPIRE_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 3

    # Encryption (AES-256)
    FIELD_ENCRYPTION_KEY: str

    # MinIO / Object Storage
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET_IMAGES: str = "xray-images"
    MINIO_BUCKET_REPORTS: str = "reports"
    MINIO_SECURE: bool = True
    PRESIGNED_URL_EXPIRE_SECONDS: int = 900

    # AI Service
    AI_SERVICE_URL: str
    AI_INFERENCE_TIMEOUT_SECONDS: int = 12
    AI_INTERNAL_API_KEY: str

    # Email
    SENDGRID_API_KEY: str
    EMAIL_FROM: str

    # Backup
    BACKUP_BUCKET: str
    BACKUP_RETENTION_DAYS: int = 180

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
