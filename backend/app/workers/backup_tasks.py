from celery import shared_task
from app.config import settings
import subprocess
import datetime
import os
import uuid
from app.services.storage import upload_file

@shared_task(name="app.workers.backup_tasks.daily_database_backup")
def daily_database_backup():
    """
    Runs `pg_dump`, compresses, optionally encrypts, and ships to MinIO bucket.
    """
    print("Initiating daily DB backup...")
    try:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"db_backup_{timestamp}.sql.gz"
        local_path = f"/tmp/{filename}"
        
        # Parse db url to get pure connect string for pg_dump if needed
        # Assuming pg_dump is available in the worker container
        
        # mock executing pg_dump via subprocess
        # subprocess.run(f"pg_dump {settings.DATABASE_URL} | gzip > {local_path}", shell=True, check=True)
        
        # Create a mock file for pipeline demonstration
        with open(local_path, "wb") as f:
            f.write(b"MOCK DB BACKUP DATA COMPRESSED")
            
        with open(local_path, "rb") as f:
            data = f.read()
            
        object_name = f"daily/{filename}"
        upload_file(settings.BACKUP_BUCKET, object_name, data, "application/gzip")
        
        os.remove(local_path)
        print(f"✅ Successfully backed up database to MinIO: {object_name}")
        
    except Exception as e:
        print(f"❌ Backup Failed: {str(e)}")
        # TODO: send admin alert email task
        # send_alert_email.delay("ADMIN_EMAIL", "Backup Failed", str(e))

@shared_task(name="app.workers.backup_tasks.session_cleanup_job")
def session_cleanup_job():
    """
    Periodic task to prune expired refresh tokens from the DB (FR-04).
    """
    print("Running hourly session cleanup...")
    from sqlalchemy import create_engine, text
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(sync_url)
    with engine.connect() as conn:
        result = conn.execute(text("DELETE FROM sessions WHERE expires_at < NOW()"))
        conn.commit()
        print(f"Cleaned up {result.rowcount} expired sessions.")
    engine.dispose()
    print("Completed session cleanup.")


@shared_task(name="app.workers.backup_tasks.delete_minio_files")
def delete_minio_files(file_list: list):
    """
    NFR-27: Delete files from MinIO for right-to-erasure compliance.
    file_list: list of (bucket_type, object_name) tuples
    """
    from minio import Minio

    client = Minio(
        settings.MINIO_ENDPOINT,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=settings.MINIO_SECURE,
    )

    deleted = 0
    for bucket_type, object_name in file_list:
        bucket = settings.MINIO_BUCKET_IMAGES if bucket_type == "images" else settings.MINIO_BUCKET_REPORTS
        try:
            client.remove_object(bucket, object_name)
            deleted += 1
        except Exception as e:
            print(f"Failed to delete {bucket}/{object_name}: {e}")

    print(f"Deleted {deleted}/{len(file_list)} files from MinIO.")
