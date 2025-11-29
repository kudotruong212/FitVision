# models/chat.py
# Chat message models

from typing import List, Optional
from pydantic import BaseModel
from models.body_analysis import BodyAnalysis, ProfilePreferences  # noqa: F401


class ChatMessage(BaseModel):
    """Single chat message"""
    role: str  # "user" | "assistant" | "system"
    content: str


class CoachChatRequest(BaseModel):
    """Request model for AI coach chat"""
    messages: List[ChatMessage]
    analysis: Optional[BodyAnalysis] = None  # dùng lại BodyAnalysis có sẵn
    profile: Optional[ProfilePreferences] = None  # thông tin mục tiêu

