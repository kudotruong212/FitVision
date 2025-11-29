# utils/json_utils.py
# JSON parsing utilities for AI responses

import json
from typing import Any, Dict


def parse_ai_json_response(content_str: str) -> Dict[str, Any]:
    """
    Parse JSON from AI response, handling cases where AI returns text with JSON.
    
    Args:
        content_str: Raw content string from AI response
        
    Returns:
        Parsed JSON dictionary
        
    Raises:
        json.JSONDecodeError: If JSON cannot be parsed
    """
    content_str = content_str.strip()
    
    try:
        return json.loads(content_str)
    except json.JSONDecodeError:
        # If model accidentally includes extra text, try to extract JSON part
        start = content_str.find("{")
        end = content_str.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(content_str[start : end + 1])
        else:
            raise

