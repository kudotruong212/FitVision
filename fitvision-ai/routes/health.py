# routes/health.py
# Health check route

from fastapi import APIRouter

router = APIRouter()


@router.get("/ai/health")
def ai_health():
    """Health check endpoint for AI service."""
    return {"status": "ok", "service": "ai"}

