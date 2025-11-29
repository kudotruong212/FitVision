# models/__init__.py
# Re-export all models

from models.body_analysis import BodyAnalysis, ProfilePreferences
from models.chat import ChatMessage, CoachChatRequest

__all__ = [
    "BodyAnalysis",
    "ProfilePreferences",
    "ChatMessage",
    "CoachChatRequest",
]

