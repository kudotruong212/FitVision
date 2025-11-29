# services/analysis_service.py
# Body analysis service using OpenAI Vision API

from typing import Dict, Any
from services.openai_service import get_openai_client
from services.pose_service import run_pose_estimation, POSE_AVAILABLE
from utils.image_utils import encode_image_to_base64, calculate_image_size
from utils.json_utils import parse_ai_json_response


def get_analysis_system_prompt() -> str:
    """Get the system prompt for body analysis."""
    return (
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


async def analyze_body_image(image_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Analyze body image using OpenAI Vision API and MediaPipe pose estimation.
    
    Args:
        image_bytes: Raw image bytes
        filename: Original filename
        
    Returns:
        Dictionary with analysis results including posture, weak muscles, score, etc.
    """
    try:
        # 1) Process image
        size_kb, _ = calculate_image_size(image_bytes)
        b64 = encode_image_to_base64(image_bytes)
        
        # 2) Get OpenAI client
        client = get_openai_client()
        
        # 3) Call OpenAI Vision API
        system_prompt = get_analysis_system_prompt()
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
        
        # 4) Parse JSON response
        ai_json = parse_ai_json_response(content_str)
        
        # 5) Build result dictionary
        result = {
            "filename": filename,
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
        
        # 6) Add pose estimation data
        pose_data = run_pose_estimation(image_bytes)
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
        import traceback
        error_msg = str(e)
        error_trace = traceback.format_exc()
        print(f"AI error (analyze): {error_msg}")
        print(f"Traceback: {error_trace}")
        return {
            "error": "AI_analysis_failed",
            "message": error_msg,
        }

