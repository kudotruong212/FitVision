# utils/image_utils.py
# Image processing utilities

import base64
from typing import Tuple


def encode_image_to_base64(image_bytes: bytes) -> str:
    """
    Encode image bytes to base64 string.
    
    Args:
        image_bytes: Raw image bytes
        
    Returns:
        Base64 encoded string
    """
    return base64.b64encode(image_bytes).decode("utf-8")


def calculate_image_size(image_bytes: bytes) -> Tuple[float, int]:
    """
    Calculate image size in KB and bytes.
    
    Args:
        image_bytes: Raw image bytes
        
    Returns:
        Tuple of (size_kb, size_bytes)
    """
    size_bytes = len(image_bytes)
    size_kb = round(size_bytes / 1024, 2)
    return size_kb, size_bytes

