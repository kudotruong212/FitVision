from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/ai/health")
def health():
    return {"status": "ok", "service": "ai"}


@app.post("/ai/analyze")
async def analyze_body(image: UploadFile = File(...)):
    # Đọc file (ở đây chưa cần xử lý thật, chỉ mock)
    contents = await image.read()
    size_kb = round(len(contents) / 1024, 2)

    # TODO: sau này xử lý bằng MediaPipe / Vision model
    return {
        "filename": image.filename,
        "size_kb": size_kb,
        "posture": "slightly rounded shoulders",
        "weak_muscles": ["upper back", "core"],
        "fat_area": "lower belly",
        "score": 72,
        "recommendations": [
            "Tăng cường các bài tập lưng trên",
            "Bổ sung plank và core workout 3 lần/tuần"
        ]
    }

