import logging
import smtplib
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger("finai.email")


def _send_smtp(to_email: str, subject: str, body: str) -> None:
    message = MIMEText(body, "plain")
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = to_email

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], message.as_string())


def send_email(to_email: str, subject: str, body: str) -> None:
    """Send an email, or log it if SMTP is not configured.

    Never raises — callers (e.g. password reset) must not fail or leak
    internal state just because outbound email is unavailable.
    """
    if not settings.SMTP_HOST:
        logger.warning(
            "SMTP_HOST not configured; logging email instead of sending. "
            "to=%s subject=%r body=%s",
            to_email,
            subject,
            body,
        )
        return

    try:
        _send_smtp(to_email, subject, body)
    except Exception:
        logger.exception("Failed to send email to %s", to_email)


def send_password_reset_email(to_email: str, reset_link: str) -> None:
    send_email(
        to_email=to_email,
        subject="Reset your FinAI password",
        body=(
            "We received a request to reset your FinAI password.\n\n"
            f"Reset your password here: {reset_link}\n\n"
            "This link expires in 1 hour. If you didn't request this, you can ignore this email."
        ),
    )
