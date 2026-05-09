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
    MINIO_BUCKET_AVATARS: str = "avatars"
    MINIO_SECURE: bool = True
    PRESIGNED_URL_EXPIRE_SECONDS: int = 900
    # External hostname browsers use to reach MinIO (e.g. "localhost:9000" in dev,
    # "storage.example.com" in prod). Set to empty string to skip replacement.
    MINIO_EXTERNAL_HOST: str = "chucklingly-ennuyante-edda.ngrok-free.dev"

    # AI Service
    AI_SERVICE_URL: str
    AI_INFERENCE_TIMEOUT_SECONDS: int = 2400
    AI_INTERNAL_API_KEY: str
    AI_MODEL_VERSION: str = "v1.0.0"

    # Email (SMTP — use Gmail App Password or any SMTP relay)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str
    EMAIL_FROM: str

    # Backup
    BACKUP_BUCKET: str
    BACKUP_RETENTION_DAYS: int = 180

    # Frontend URL for CORS (comma-separated list allowed)
    FRONTEND_URL: str = "http://localhost:3000"

    # Set to true to seed test users on startup (dev only)
    SEED_TEST_USERS: bool = False

    # Set to true to skip OTP verification on login (dev only)
    SKIP_OTP: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
