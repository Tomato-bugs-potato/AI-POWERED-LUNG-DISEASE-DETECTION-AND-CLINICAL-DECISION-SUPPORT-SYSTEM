import io
import datetime
from minio import Minio
from minio.error import S3Error
from app.config import settings


# Initialize minio client
minio_client = Minio(
    settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", ""),
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE
)

def ensure_buckets_exist():
    """Create buckets if they do not exist"""
    buckets = [settings.MINIO_BUCKET_IMAGES, settings.MINIO_BUCKET_REPORTS, settings.BACKUP_BUCKET]
    for bucket in buckets:
        try:
            if not minio_client.bucket_exists(bucket):
                minio_client.make_bucket(bucket)
                # optionally enable versioning here
        except S3Error as e:
            print(f"MinIO bucket error: {e}")

def upload_file(bucket_name: str, object_name: str, data: bytes, content_type: str) -> str:
    """Upload data stream to MinIO. In real prod we use Server side encryption."""
    try:
        data_stream = io.BytesIO(data)
        minio_client.put_object(
            bucket_name,
            object_name,
            data_stream,
            length=len(data),
            content_type=content_type
            # sse=sse # Implement SSE-C or SSE-KMS for AES-256 for Prod
        )
        return object_name
    except Exception as e:
        raise Exception(f"Upload to MinIO failed: {str(e)}")

def get_presigned_url(bucket_name: str, object_name: str, expires_sec: int = settings.PRESIGNED_URL_EXPIRE_SECONDS) -> str:
    """Generate a presigned GET URL valid for X seconds"""
    try:
        url = minio_client.presigned_get_object(
            bucket_name, 
            object_name, 
            expires=datetime.timedelta(seconds=expires_sec)
        )
        # Replace Docker-internal hostname with browser-accessible localhost
        # (browser runs on the same machine as MinIO, so localhost works)
        url = url.replace("minio:9000", "localhost:9000")
        return url
    except Exception as e:
        raise Exception(f"URL generation failed: {str(e)}")

def file_exists(bucket_name: str, object_name: str) -> bool:
    """Check if object exists"""
    try:
        minio_client.stat_object(bucket_name, object_name)
        return True
    except S3Error as exc:
        if exc.code == "NoSuchKey":
            return False
        raise

def get_file_data(bucket_name: str, object_name: str) -> tuple[bytes, str]:
    """Download file bytes and content-type from MinIO."""
    try:
        stat = minio_client.stat_object(bucket_name, object_name)
        response = minio_client.get_object(bucket_name, object_name)
        data = response.read()
        response.close()
        response.release_conn()
        content_type = stat.content_type or "application/octet-stream"
        return data, content_type
    except S3Error as exc:
        raise Exception(f"Download from MinIO failed: {str(exc)}")
