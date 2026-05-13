import io
import datetime
from minio import Minio
from minio.error import S3Error
from app.config import settings


# Internal client — used for put/get over the docker network
minio_client = Minio(
    settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", ""),
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE
)

# External client — used ONLY to mint presigned URLs whose Host header will
# be the public ngrok hostname. SigV4 signs the Host header, so the URL must
# be signed against the same host the downloader will send.
_minio_external_client = Minio(
    settings.MINIO_EXTERNAL_HOST,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=True,  # ngrok terminates TLS
) if settings.MINIO_EXTERNAL_HOST else None

def ensure_buckets_exist():
    """Create buckets if they do not exist"""
    buckets = [settings.MINIO_BUCKET_IMAGES, settings.MINIO_BUCKET_REPORTS, settings.MINIO_BUCKET_AVATARS, settings.BACKUP_BUCKET]
    for bucket in buckets:
        try:
            if not minio_client.bucket_exists(bucket):
                minio_client.make_bucket(bucket)
            
            # GAP-10: Avatars must be publicly readable for profiles to work without presigning every time
            if bucket == settings.MINIO_BUCKET_AVATARS:
                _set_avatar_public_policy(bucket)
        except S3Error as e:
            print(f"MinIO bucket error: {e}")

def _set_avatar_public_policy(bucket: str):
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
                "Resource": [f"arn:aws:s3:::{bucket}"],
            },
            {
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{bucket}/*"],
            },
        ],
    }
    import json
    minio_client.set_bucket_policy(bucket, json.dumps(policy))

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

def get_presigned_url(
    bucket_name: str,
    object_name: str,
    expires_sec: int = settings.PRESIGNED_URL_EXPIRE_SECONDS,
    external_host: str | None = None,
) -> str:
    """Generate a presigned GET URL valid for X seconds.

    external_host: when truthy, mint the URL with the external MinIO client
    so the signature is computed against the public host (ngrok). The URL
    can then be fetched from outside the docker network. When falsy, mint
    against minio:9000 and rewrite to localhost for browser use.
    """
    try:
        if external_host and _minio_external_client is not None:
            return _minio_external_client.presigned_get_object(
                bucket_name,
                object_name,
                expires=datetime.timedelta(seconds=expires_sec),
            )
        url = minio_client.presigned_get_object(
            bucket_name,
            object_name,
            expires=datetime.timedelta(seconds=expires_sec)
        )
        return url.replace("minio:9000", "localhost:9000")
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
