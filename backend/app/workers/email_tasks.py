import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from celery import shared_task
from app.config import settings
import logging

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, html_content: str):
    """
    Sends an email using the configured SMTP server.
    Raises exception on failure to allow Celery to handle retries.
    """
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to_email

        part = MIMEText(html_content, "html")
        msg.attach(part)

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAIL_FROM, to_email, msg.as_string())
        server.quit()

        logger.info(f"Successfully sent '{subject}' to {to_email}")

    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        raise e

@shared_task(name="app.workers.email_tasks.send_otp_email", bind=True, max_retries=3)
def send_otp_email(self, to_email: str, otp_code: str):
    subject = "Your verification code"
    content = f"""
    <html>
        <body>
            <h2>Lung Disease Detection System</h2>
            <p>Your OTP verification code is:</p>
            <h1>{otp_code}</h1>
            <p>This code will expire in 5 minutes. Do not share it with anyone.</p>
        </body>
    </html>
    """
    try:
        send_email(to_email, subject, content)
    except Exception as exc:
        self.retry(exc=exc, countdown=10)

@shared_task(name="app.workers.email_tasks.send_welcome_email", bind=True, max_retries=3)
def send_welcome_email(self, to_email: str, name: str, temp_password: str):
    subject = "Welcome to Lung Disease Detection System"
    content = f"""
    <html>
        <body>
            <h2>Welcome {name}!</h2>
            <p>An administrator has created an account for you.</p>
            <p>Your temporary password is: <strong>{temp_password}</strong></p>
            <p>Please log in and update your password immediately.</p>
        </body>
    </html>
    """
    try:
        send_email(to_email, subject, content)
    except Exception as exc:
        self.retry(exc=exc, countdown=15)
        
@shared_task(name="app.workers.email_tasks.send_role_change_notification", ignore_result=True)
def send_role_change_notification(to_email: str, new_role: str):
    subject = "Your role has been updated"
    content = f"<p>Your system access role has been updated to: <strong>{new_role}</strong></p>"
    # Since failure is non-fatal per spec, we catch without retrying
    try:
        send_email(to_email, subject, content)
    except Exception:
        pass
