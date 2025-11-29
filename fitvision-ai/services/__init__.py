# services/__init__.py
# Re-export all services

from services.openai_service import get_openai_client
from services.pose_service import run_pose_estimation, POSE_AVAILABLE
from services.analysis_service import analyze_body_image
from services.plan_service import generate_workout_plan
from services.coach_service import chat_with_coach, coach_chat_legacy

__all__ = [
    "get_openai_client",
    "POSE_AVAILABLE",
    "run_pose_estimation",
    "analyze_body_image",
    "generate_workout_plan",
    "chat_with_coach",
    "coach_chat_legacy",
]

