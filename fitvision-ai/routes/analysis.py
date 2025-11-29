# routes/analysis.py
# Body analysis route

from fastapi import APIRouter, File, UploadFile
from services.analysis_service import analyze_body_image

router = APIRouter()


@router.post("/ai/analyze")
async def analyze_body(image: UploadFile = File(...)):
    """
    Analyze body image using OpenAI Vision API and MediaPipe pose estimation.
    
    Args:
        image: Uploaded image file
        
    Returns:
        Dictionary with analysis results
    """
    content = await image.read()
    return await analyze_body_image(content, image.filename or "unknown.jpg")

