"""
Development settings — extends base with debug-friendly overrides.
"""
from .base import *  # noqa: F401, F403

DEBUG = True

# Allow all hosts in development
ALLOWED_HOSTS = ["*"]

# Show SQL queries in console during development (toggle as needed)
# LOGGING["loggers"]["django.db.backends"]["level"] = "DEBUG"

# CORS — allow Vite dev server and Electron renderer
CORS_ALLOW_ALL_ORIGINS = True  # Dev only; production uses explicit CORS_ALLOWED_ORIGINS

