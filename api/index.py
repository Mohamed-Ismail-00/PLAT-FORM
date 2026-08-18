"""
Vercel Serverless Function entry point for FastAPI.
This file makes the entire FastAPI application available as a single serverless function.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

os.environ.setdefault("ENVIRONMENT", "production")
os.environ.setdefault("DEBUG", "false")

from app.main import app  # noqa: E402

handler = app
