# services/pose_service.py
# Pose estimation service using MediaPipe

import io
from typing import Optional, Dict, List

import sys

try:
    import numpy as np
    from PIL import Image
    import mediapipe as mp
    POSE_AVAILABLE = True
    mp_pose = mp.solutions.pose if mp else None
except ImportError as e:
    np = None
    Image = None
    mp = None
    POSE_AVAILABLE = False
    mp_pose = None
    # Only show warning if it's not a known compatibility issue
    error_msg = str(e)
    if 'mediapipe' in error_msg.lower():
        # MediaPipe may not support Python 3.13+ yet - this is expected
        python_version = f"{sys.version_info.major}.{sys.version_info.minor}"
        if sys.version_info.major == 3 and sys.version_info.minor >= 13:
            # Suppress warning for Python 3.13+ as MediaPipe doesn't support it yet
            pass
        else:
            print(f"⚠️  Pose estimation unavailable: MediaPipe not installed (optional feature)")
    elif 'numpy' in error_msg.lower() or 'PIL' in error_msg.lower() or 'Pillow' in error_msg.lower():
        print(f"⚠️  Pose estimation dependencies not available: {e}")
except Exception as e:
    np = None
    Image = None
    mp = None
    POSE_AVAILABLE = False
    mp_pose = None
    print(f"⚠️  Pose estimation initialization error: {e}")


def run_pose_estimation(image_bytes: bytes) -> Optional[Dict]:
    """
    Run pose estimation on image using MediaPipe.
    
    Args:
        image_bytes: Raw image bytes
        
    Returns:
        Dictionary with confidence and points, or None if unavailable/failed
    """
    if not POSE_AVAILABLE or mp_pose is None:
        return None

    try:
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image_np = np.array(pil_image)
    except Exception as exc:
        print("Pose estimation decode error:", repr(exc))
        return None

    with mp_pose.Pose(static_image_mode=True) as pose:
        results = pose.process(image_np)

    if not results or not results.pose_landmarks:
        return {"confidence": 0.0, "points": []}

    landmarks = results.pose_landmarks.landmark
    confidence = sum(lm.visibility for lm in landmarks) / len(landmarks)
    points: List[Dict] = [
        {
            "x": round(lm.x, 4),
            "y": round(lm.y, 4),
            "z": round(lm.z, 4),
            "visibility": round(lm.visibility, 4),
        }
        for lm in landmarks
    ]
    return {"confidence": round(confidence, 3), "points": points}

