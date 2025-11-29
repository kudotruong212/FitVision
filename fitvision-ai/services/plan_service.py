# services/plan_service.py
# Workout plan generation service

import json
from typing import Dict, Any, Union
from models.body_analysis import BodyAnalysis, ProfilePreferences
from services.openai_service import get_openai_client
from utils.json_utils import parse_ai_json_response


def get_plan_system_prompt() -> str:
    """Get the system prompt for workout plan generation."""
    return (
        "You are an experienced strength & conditioning coach. "
        "You design safe, effective weekly gym/yoga workout plans "
        "based on a body analysis."
    )


def build_plan_user_prompt(analysis: BodyAnalysis, profile: ProfilePreferences = None) -> str:
    """
    Build user prompt for workout plan generation.
    
    Args:
        analysis: Body analysis data
        profile: Optional user profile preferences
        
    Returns:
        Formatted user prompt string
    """
    analysis_dict = analysis.model_dump()
    analysis_json_str = json.dumps(analysis_dict, ensure_ascii=False)
    
    profile_section = ""
    if profile:
        profile_section = (
            "Here are the client's goals, training preferences and constraints:\n"
            f"{json.dumps(profile.model_dump(), ensure_ascii=False)}\n\n"
        )
    
    return (
        "Here is the body analysis of a Vietnamese client:\n"
        f"{analysis_json_str}\n\n"
        f"{profile_section}"
        "Based on this, design a 1–2 week workout plan.\n"
        "- 3–5 sessions per week.\n"
        "- Each session has 3–6 exercises.\n"
        "- Use simple gym/yoga exercises that can be done in a standard gym.\n"
        "- Focus on fixing weak muscles and posture problems, and reducing fat in the main fat area.\n\n"
        "Return ONLY valid JSON with the following format (no extra text):\n"
        "{\n"
        '  "level": "Beginner | Intermediate | Advanced",\n'
        '  "sessions_per_week": 4,\n'
        '  "focus_areas": ["upper back", "posture", "core stability", "fat loss"],\n'
        '  "sessions": [\n'
        '    {\n'
        '      "title": "Buổi 1 – upper back",\n'
        '      "focus": ["upper back"],\n'
        '      "exercises": [\n'
        '        {\n'
        '          "name": "Seated Row",\n'
        '          "muscle_group": "upper back",\n'
        '          "sets": 3,\n'
        '          "reps": "10–12",\n'
        '          "notes": "Giữ ngực mở, siết xô và lưng giữa."\n'
        '        }\n'
        '      ]\n'
        '    }\n'
        '  ]\n'
        "}\n"
    )


async def generate_workout_plan(
    payload: Union[dict, BodyAnalysis],
    profile: ProfilePreferences = None
) -> Dict[str, Any]:
    """
    Generate workout plan based on body analysis and optional profile.
    
    Args:
        payload: Body analysis data (dict or BodyAnalysis object)
        profile: Optional user profile preferences
        
    Returns:
        Dictionary with workout plan (level, sessions_per_week, focus_areas, sessions)
    """
    try:
        # Parse analysis from payload
        if isinstance(payload, BodyAnalysis):
            analysis = payload
        else:
            raw_analysis = payload.get("analysis") or payload
            analysis = BodyAnalysis(**raw_analysis)
            raw_profile = payload.get("profile")
            profile = ProfilePreferences(**raw_profile) if raw_profile else None
        
        # Get OpenAI client
        client = get_openai_client()
        
        # Build prompts
        system_prompt = get_plan_system_prompt()
        user_prompt = build_plan_user_prompt(analysis, profile)
        
        # Call OpenAI API
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        
        content_str = resp.choices[0].message.content.strip()
        
        # Parse JSON response
        plan_json = parse_ai_json_response(content_str)
        
        return plan_json
        
    except Exception as e:
        print("AI plan error:", repr(e))
        return {
            "error": "AI_plan_failed",
            "message": str(e),
        }

