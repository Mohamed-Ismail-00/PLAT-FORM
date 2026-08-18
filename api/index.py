ئل"""
Vercel Serverless Function entry point for FastAPI.
This file makes the entire FastAPI application available as a single serverless function.
"""

import sys
import os

# Add the backend directory to Python path so 'from app.xxx' imports resolve correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Set environment to production if not set
os.environ.setdefault("ENVIRONMENT", "production")
os.environ.setdefault("DEBUG", "false")

from app.main import app  # noqa: E402

# Vercel looks for an 'app' variable (ASGI handler)
handler = app
