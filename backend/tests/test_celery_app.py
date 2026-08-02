import subprocess
import sys


def test_celery_app_registers_all_models_for_mapper_configuration():
    """Regression test: the worker process only ever imports app.core.celery_app
    (never app.main), so any model reachable via a string-based relationship()
    must be imported there too, or SQLAlchemy fails the first time it actually
    configures mappers — not at import time, so a normal test-suite run (where
    conftest.py already imported every model) won't catch this. Run in a fresh
    subprocess to reproduce the worker's actual isolated import context.
    """
    # `celery.conf.update(imports=[...])` is only read by the real worker
    # bootstrap, not by a plain import of this module — so replicate what
    # the worker actually does: import the task modules too, then trigger
    # the mapper configuration that only happens lazily.
    code = (
        "from app.core.celery_app import celery\n"
        "import app.tasks.ocr\n"
        "from sqlalchemy.orm import configure_mappers\n"
        "configure_mappers()\n"
    )
    result = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
