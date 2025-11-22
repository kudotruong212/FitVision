import base64
import json
import os
from typing import List, Optional

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

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


# ================= WORKOUT PLAN GENERATOR =================
@app.post("/ai/plan/generate")
async def generate_workout_plan(analysis: BodyAnalysis):
    """
    Nhận kết quả Body Scan (BodyAnalysis),
    sinh ra Workout Plan cá nhân hóa bằng GPT-4o-mini.
    """
    try:
        # 1) Convert body analysis sang JSON string cho dễ embed
        analysis_dict = analysis.model_dump()
        analysis_json_str = json.dumps(analysis_dict, ensure_ascii=False)

        # 2) Prompt cho GPT
        system_prompt = (
            "You are an experienced strength & conditioning coach. "
            "You design safe, effective weekly gym/yoga workout plans "
            "based on a body analysis."
        )

        user_prompt = (
            "Here is the body analysis of a Vietnamese client:\n"
            f"{analysis_json_str}\n\n"
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

        # 3) Gọi GPT text-only
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        content_str = resp.choices[0].message.content.strip()

        # 4) Parse JSON plan
        try:
            plan_json = json.loads(content_str)
        except json.JSONDecodeError:
            start = content_str.find("{")
            end = content_str.rfind("}")
            if start != -1 and end != -1 and end > start:
                plan_json = json.loads(content_str[start : end + 1])
            else:
                raise

        # 5) Trả về thẳng plan cho backend Node / frontend
        return plan_json

    except Exception as e:
        print("AI plan error:", repr(e))
        return {
            "error": "AI_plan_failed",
            "message": str(e),
        }
