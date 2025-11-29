# routes/coach.py
# AI Coach chat routes

from fastapi import APIRouter
from models.chat import CoachChatRequest
from services.coach_service import chat_with_coach, coach_chat_legacy

router = APIRouter()


@router.post("/ai/chat")
async def ai_coach_chat(payload: CoachChatRequest):
    """
    Chat with AI Coach using structured request model.
    
    Args:
        payload: CoachChatRequest with messages, analysis, and profile
        
    Returns:
        Dictionary with answer from AI coach
    """
    return await chat_with_coach(payload)


@router.post("/ai/coach")
def coach_chat(payload: dict):
    """
    Legacy coach chat endpoint (backward compatibility).
    
    Args:
        payload: Dictionary with user_message, context, profile
        
    Returns:
        Dictionary with reply from AI coach
    """
    return coach_chat_legacy(payload)

