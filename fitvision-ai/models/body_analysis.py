# models/body_analysis.py
# Body analysis and profile models

from typing import List, Optional
from pydantic import BaseModel


class BodyAnalysis(BaseModel):
    """Body analysis result from AI vision model"""
    posture: str
    weak_muscles: List[str] = []
    fat_area: str
    score: float
    recommendations: List[str] = []
    body_shape: Optional[str] = None
    risk_level: Optional[str] = None
    notes: Optional[str] = None


class ProfilePreferences(BaseModel):
    """User profile and training preferences"""
    goal: Optional[str] = None
    experience_level: Optional[str] = None
    preferred_modalities: List[str] = []
    injuries: List[str] = []
    equipment: List[str] = []
    nutrition_style: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    weekly_sessions_target: Optional[int] = None
    notes: Optional[str] = None

