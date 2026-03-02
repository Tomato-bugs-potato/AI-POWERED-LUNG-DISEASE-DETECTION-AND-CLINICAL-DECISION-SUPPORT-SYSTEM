from celery.schedules import crontab
from app.workers.celery_app import celery_app

# Import tasks to ensure they are registered
from app.workers import backup_tasks
from app.workers import email_tasks
from app.workers import inference_tasks
from app.workers import report_tasks

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Daily Database Backup at 2 AM
    sender.add_periodic_task(
        crontab(hour=2, minute=0),
        backup_tasks.daily_database_backup.s(),
        name='Daily DB backup'
    )
    
    # Weekly Full Snapshot (Sunday 2 AM)
    # sender.add_periodic_task(crontab(day_of_week=0, hour=2, minute=0),...)

    # Hourly Session Token Cleanup
    sender.add_periodic_task(
        crontab(minute=0), 
        backup_tasks.session_cleanup_job.s(),
        name='Hourly token cleanup'
    )
