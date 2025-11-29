# routes/__init__.py
# Register all routes with FastAPI app

from fastapi import FastAPI
from routes import health, analysis, plan, coach


def register_routes(app: FastAPI):
    """Register all routes with the FastAPI app."""
    app.include_router(health.router)
    app.include_router(analysis.router)
    app.include_router(plan.router)
    app.include_router(coach.router)

