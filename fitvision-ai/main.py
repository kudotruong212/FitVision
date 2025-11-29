import base64
import io
import json
import os
from typing import List, Optional, Union

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

try:
    import numpy as np
except Exception:  # pragma: no cover - optional dependency
    np = None

try:
    from PIL import Image
except Exception:  # pragma: no cover - optional dependency
    Image = None

try:
    import mediapipe as mp
except Exception:  # pragma: no cover - optional dependency
    mp = None

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
POSE_AVAILABLE = bool(mp and Image and np)
mp_pose = mp.solutions.pose if POSE_AVAILABLE else None


def run_pose_estimation(image_bytes: bytes):
    if not POSE_AVAILABLE or mp_pose is None:
        return None

    try:
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(pil_image)
    except Exception as exc:  # pragma: no cover - fallback if pillow fails
        print("Pose estimation decode error:", repr(exc))
        return None

    with mp_pose.Pose(static_image_mode=True) as pose:
        results = pose.process(image_np)

    if not results or not results.pose_landmarks:
        return {"confidence": 0.0, "points": []}

    landmarks = results.pose_landmarks.landmark
    confidence = sum(lm.visibility for lm in landmarks) / len(landmarks)
    points = [
        {
            "x": round(lm.x, 4),
            "y": round(lm.y, 4),
            "z": round(lm.z, 4),
            "visibility": round(lm.visibility, 4),
        }
        for lm in landmarks
    ]
    return {"confidence": round(confidence, 3), "points": points}


# ================= HEALTH CHECK =================
@app.get("/ai/health")
def ai_health():
    return {"status": "ok", "service": "ai"}


# ================= BODY ANALYZE (VISION) =================
@app.post("/ai/analyze")
async def analyze_body(image: UploadFile = File(...)):
    try:
        # 1) Đọc bytes ảnh & convert base64
        content = await image.read()
        size_kb = round(len(content) / 1024, 2)
        b64 = base64.b64encode(content).decode("utf-8")

        # 2) Prompt hệ thống
        system_prompt = (
            "You are a professional fitness coach and posture specialist. "
            "Analyze the person's body based on the photo. "
            "Focus on posture, weak muscles, main fat area, and overall posture/fitness score "
            "from 0 to 100. Also infer a short body shape description and a simple risk level "
            "for posture-related issues.\n\n"
            "Return ONLY a valid JSON object with the following fields:\n"
            "- posture: string\n"
            "- weak_muscles: array of strings\n"
            "- fat_area: string\n"
            "- score: number\n"
            "- recommendations: array of strings\n"
            "- body_shape: string\n"
            "- risk_level: string (low / medium / high)\n"
            "- notes: string\n\n"
            "Do not include backticks, markdown or any explanation text. "
            "Just return the pure JSON."
        )

        # 3) Gọi GPT-4o-mini qua chat.completions kèm image
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Here is the user's full-body photo:",
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64}"
                            },
                        },
                    ],
                },
            ],
        )

        content_str = resp.choices[0].message.content.strip()

        # 4) Parse JSON từ content
        try:
            ai_json = json.loads(content_str)
        except json.JSONDecodeError:
            # nếu model lỡ in thêm text, cố gắng cắt phần JSON
            start = content_str.find("{")
            end = content_str.rfind("}")
            if start != -1 and end != -1 and end > start:
                ai_json = json.loads(content_str[start : end + 1])
            else:
                raise

        # 5) Ghép kết quả gửi về cho frontend
        result = {
            "filename": image.filename,
            "size_kb": size_kb,
            "posture": ai_json.get("posture", ""),
            "weak_muscles": ai_json.get("weak_muscles", []),
            "fat_area": ai_json.get("fat_area", ""),
            "score": ai_json.get("score", 0),
            "recommendations": ai_json.get("recommendations", []),
            "body_shape": ai_json.get("body_shape", ""),
            "risk_level": ai_json.get("risk_level", ""),
            "notes": ai_json.get("notes", ""),
        }

        pose_data = run_pose_estimation(content)
        if pose_data:
            result["pose_confidence"] = pose_data.get("confidence")
            result["pose_points"] = pose_data.get("points", [])
            if pose_data.get("confidence", 0) < 0.5:
                result["pose_warning"] = (
                    "Độ tin cậy nhận diện pose thấp. Hãy chụp ảnh sáng và đứng thẳng hơn."
                )
        else:
            result["pose_confidence"] = None
            result["pose_points"] = []
            if not POSE_AVAILABLE:
                result["pose_warning"] = "Pose estimation module không khả dụng trên server."

        return result

    except Exception as e:
        print("AI error (analyze):", repr(e))
        return {
            "error": "AI_analysis_failed",
            "message": str(e),
        }


# ================= MODEL INPUT CHO PLAN =================
class BodyAnalysis(BaseModel):
    posture: str
    weak_muscles: List[str] = []
    fat_area: str
    score: float
    recommendations: List[str] = []
    body_shape: Optional[str] = None
    risk_level: Optional[str] = None
    notes: Optional[str] = None

class ProfilePreferences(BaseModel):
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

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str

class CoachChatRequest(BaseModel):
    messages: List[ChatMessage]
    analysis: Optional[BodyAnalysis] = None  # dùng lại BodyAnalysis có sẵn
    profile: Optional[ProfilePreferences] = None  # thông tin mục tiêu

# ================= WORKOUT PLAN GENERATOR =================
@app.post("/ai/plan/generate")
async def generate_workout_plan(payload: Union[dict, BodyAnalysis]):
    """
    Nhận kết quả Body Scan (BodyAnalysis) kèm hồ sơ mục tiêu (nếu có),
    sinh ra Workout Plan cá nhân hóa bằng GPT-4o-mini.
    """
    try:
        if isinstance(payload, BodyAnalysis):
            analysis = payload
            profile = None
        else:
            raw_analysis = payload.get("analysis") or payload
            analysis = BodyAnalysis(**raw_analysis)
            raw_profile = payload.get("profile")
            profile = ProfilePreferences(**raw_profile) if raw_profile else None

        analysis_dict = analysis.model_dump()
        analysis_json_str = json.dumps(analysis_dict, ensure_ascii=False)
        profile_section = ""
        if profile:
            profile_section = (
                "Here are the client's goals, training preferences and constraints:\n"
                f"{json.dumps(profile.model_dump(), ensure_ascii=False)}\n\n"
            )

        system_prompt = (
            "You are an experienced strength & conditioning coach. "
            "You design safe, effective weekly gym/yoga workout plans "
            "based on a body analysis."
        )

        user_prompt = (
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
            '  \"level\": \"Beginner | Intermediate | Advanced\",\n'
            '  \"sessions_per_week\": 4,\n'
            '  \"focus_areas\": [\"upper back\", \"posture\", \"core stability\", \"fat loss\"],\n'
            '  \"sessions\": [\n'
            '    {\n'
            '      \"title\": \"Buổi 1 – upper back\",\n'
            '      \"focus\": [\"upper back\"],\n'
            '      \"exercises\": [\n'
            '        {\n'
            '          \"name\": \"Seated Row\",\n'
            '          \"muscle_group\": \"upper back\",\n'
            '          \"sets\": 3,\n'
            '          \"reps\": \"10–12\",\n'
            '          \"notes\": \"Giữ ngực mở, siết xô và lưng giữa.\"\n'
            '        }\n'
            '      ]\n'
            '    }\n'
            '  ]\n'
            "}\n"
        )

        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        content_str = resp.choices[0].message.content.strip()

        try:
            plan_json = json.loads(content_str)
        except json.JSONDecodeError:
            start = content_str.find("{")
            end = content_str.rfind("}")
            if start != -1 and end != -1 and end > start:
                plan_json = json.loads(content_str[start : end + 1])
            else:
                raise

        return plan_json

    except Exception as e:
        print("AI plan error:", repr(e))
        return {
            "error": "AI_plan_failed",
            "message": str(e),
        }

@app.post("/ai/chat")
async def ai_coach_chat(payload: CoachChatRequest):
    """
    Chat với AI Coach, có thể dùng kèm body analysis để cá nhân hóa trả lời.
    """
    try:
        # 1) Chuẩn bị context phân tích cơ thể (nếu có)
        context_text = ""
        if payload.analysis:
            analysis_dict = payload.analysis.model_dump()
            context_text = (
                "Dưới đây là phân tích cơ thể gần nhất của khách hàng:\n"
                f"{json.dumps(analysis_dict, ensure_ascii=False, indent=2)}\n\n"
            )

        profile_text = ""
        if payload.profile:
            profile_dict = payload.profile.model_dump()
            profile_text = (
                "Dưới đây là hồ sơ mục tiêu & lịch sử chấn thương của khách hàng:\n"
                f"{json.dumps(profile_dict, ensure_ascii=False, indent=2)}\n\n"
            )

        # 2) Hệ thống prompt
        system_prompt = (
            "You are a Vietnamese fitness coach and physical therapist. "
            "You answer in Vietnamese, with friendly and clear tone. "
            "You must give specific, actionable workout/rehab suggestions. "
            "If the user asks unsafe things, explain the risk."
        )

        # 3) Ghép messages cho OpenAI
        messages = [
            {"role": "system", "content": system_prompt},
        ]

        if context_text:
            messages.append(
                {
                    "role": "system",
                    "content": context_text,
                }
            )
        if profile_text:
            messages.append(
                {
                    "role": "system",
                    "content": profile_text,
                }
            )

        # Thêm lịch sử chat từ FE
        for m in payload.messages:
            messages.append({"role": m.role, "content": m.content})

        # 4) Gọi GPT-4o-mini (text only)
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


@app.post("/ai/coach")
def coach_chat(payload: dict):
    user_msg = payload.get("user_message", "")
    ctx = payload.get("context", {})

    scan = ctx.get("latest_scan") or {}
    plan = ctx.get("plan") or {}
    profile = payload.get("profile") or {}
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

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg},
        ],
    )

    reply = resp.choices[0].message.content
    return {"reply": reply}
