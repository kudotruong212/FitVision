# routes/plan.py
# Workout plan generation route

from fastapi import APIRouter
from typing import Union
from models.body_analysis import BodyAnalysis
from services.plan_service import generate_workout_plan

router = APIRouter()


@router.post("/ai/plan/generate")
async def generate_workout_plan_endpoint(payload: Union[dict, BodyAnalysis]):
    """
    Generate workout plan based on body analysis and optional profile.
    
    Args:
        payload: Body analysis data (dict or BodyAnalysis object) with optional profile
        
    Returns:
        Dictionary with workout plan
    """
    return await generate_workout_plan(payload)

