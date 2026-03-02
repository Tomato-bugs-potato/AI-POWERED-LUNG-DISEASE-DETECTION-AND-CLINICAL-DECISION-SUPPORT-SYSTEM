from celery import Celery
from app.config import settings

celery_app = Celery(
    "lung_workers",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_routes={
        "app.workers.inference_tasks.*": {"queue": "inference"},
        "app.workers.report_tasks.*": {"queue": "reports"},
        "app.workers.email_tasks.*": {"queue": "emails"},
        "app.workers.backup_tasks.*": {"queue": "backups"},
    }
)

# Autodiscover tasks for workers
celery_app.autodiscover_tasks([
    'app.workers.inference_tasks',
    'app.workers.report_tasks',
    'app.workers.email_tasks',
    'app.workers.backup_tasks'
])
