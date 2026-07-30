import logging
import sys

from app.core.config import settings


def configure_logging() -> None:
    level = logging.INFO if settings.is_production else logging.DEBUG
    root = logging.getLogger()
    if root.handlers:
        root.setLevel(level)
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    )
    root.setLevel(level)
    root.addHandler(handler)

    # Quiet noisy third-party loggers unless we're debugging.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    if settings.SENTRY_DSN:
        try:
            import sentry_sdk

            sentry_sdk.init(dsn=settings.SENTRY_DSN, environment=settings.ENVIRONMENT)
        except ImportError:
            logging.getLogger("finai.startup").warning(
                "SENTRY_DSN is set but sentry-sdk is not installed; skipping error tracking setup."
            )
