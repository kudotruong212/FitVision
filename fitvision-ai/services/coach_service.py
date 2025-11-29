# services/coach_service.py
# AI Coach chat service

import json
from typing import Dict, Any, Optional
from models.chat import CoachChatRequest
from models.body_analysis import BodyAnalysis, ProfilePreferences
from services.openai_service import get_openai_client


def get_coach_system_prompt() -> str:
    """Get the system prompt for AI coach chat."""
    return (
        "You are a Vietnamese fitness coach and physical therapist. "
        "You answer in Vietnamese, with friendly and clear tone. "
        "You must give specific, actionable workout/rehab suggestions. "
        "If the user asks unsafe things, explain the risk."
    )


def build_coach_context(analysis: Optional[BodyAnalysis], profile: Optional[ProfilePreferences]) -> tuple[str, str]:
    """
    Build context text from analysis and profile.
    
    Args:
        analysis: Optional body analysis data
        profile: Optional user profile preferences
        
    Returns:
        Tuple of (context_text, profile_text)
    """
    context_text = ""
    if analysis:
        analysis_dict = analysis.model_dump()
        context_text = (
            "Dưới đây là phân tích cơ thể gần nhất của khách hàng:\n"
            f"{json.dumps(analysis_dict, ensure_ascii=False, indent=2)}\n\n"
        )
    
    profile_text = ""
    if profile:
        profile_dict = profile.model_dump()
        profile_text = (
            "Dưới đây là hồ sơ mục tiêu & lịch sử chấn thương của khách hàng:\n"
            f"{json.dumps(profile_dict, ensure_ascii=False, indent=2)}\n\n"
        )
    
    return context_text, profile_text


async def chat_with_coach(request: CoachChatRequest) -> Dict[str, Any]:
    """
    Chat with AI Coach using structured request model.
    
    Args:
        request: CoachChatRequest with messages, analysis, and profile
        
    Returns:
        Dictionary with answer from AI coach
    """
    try:
        # Build context
        context_text, profile_text = build_coach_context(
            request.analysis,
            request.profile
        )
        
        # Get OpenAI client
        client = get_openai_client()
        
        # Build messages
        system_prompt = get_coach_system_prompt()
        messages = [
            {"role": "system", "content": system_prompt},
        ]
        
        if context_text:
            messages.append({
                "role": "system",
                "content": context_text,
            })
        
        if profile_text:
            messages.append({
                "role": "system",
                "content": profile_text,
            })
        
        # Add chat history
        for m in request.messages:
            messages.append({"role": m.role, "content": m.content})
        
        # Call OpenAI API
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
        )
        
        answer = resp.choices[0].message.content.strip()
        
        return {
            "answer": answer,
        }
        
    except Exception as e:
        print("AI coach chat error:", repr(e))
        return {
            "error": "AI_coach_failed",
            "message": str(e),
        }


def coach_chat_legacy(payload: dict) -> Dict[str, Any]:
    """
    Legacy coach chat endpoint (backward compatibility).
    
    Args:
        payload: Dictionary with user_message, context, profile
        
    Returns:
        Dictionary with reply from AI coach
    """
    try:
        user_msg = payload.get("user_message", "")
        ctx = payload.get("context", {})
        profile = payload.get("profile") or {}
        
        scan = ctx.get("latest_scan") or {}
        plan = ctx.get("plan") or {}
        pref_modalities = ", ".join(profile.get("preferred_modalities", [])) or "N/A"
        injury_list = ", ".join(profile.get("injuries", [])) or "Không báo cáo"
        
        system_prompt = f"""
    You are FitVision AI Coach, a friendly but expert fitness trainer.
    Always base your responses on the user's latest body scan data and workout plan.

    Body Scan:
    Posture: {scan.get('posture')}
    Weak muscles: {scan.get('weak_muscles')}
    Fat area: {scan.get('fat_area')}
    Score: {scan.get('score')}
    Risk level: {scan.get('risk_level')}
    Notes: {scan.get('notes')}

    Workout Plan:
    Level: {plan.get('level')}
    Focus: {plan.get('focus_areas')}
    Sessions: {plan.get('sessions')}

    Profile:
    Goal: {profile.get('goal')}
    Experience level: {profile.get('experience_level')}
    Preferred modalities: {pref_modalities}
    Injuries or pain points: {injury_list}
    Equipment: {", ".join(profile.get('equipment', [])) or "Không rõ"}
    Weekly session target: {profile.get('weekly_sessions_target')}
    """
        
        client = get_openai_client()
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_msg},
            ],
        )
        
        reply = resp.choices[0].message.content
        return {"reply": reply}
        
    except Exception as e:
        print("AI coach chat error:", repr(e))
        return {
            "error": "AI_coach_failed",
            "message": str(e),
        }

