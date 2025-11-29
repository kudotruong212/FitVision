# services/openai_service.py
# OpenAI client initialization

import os
from openai import OpenAI

_client = None


def get_openai_client() -> OpenAI:
    """
    Get or create OpenAI client instance.
    
    Returns:
        OpenAI client instance
    """
    global _client
    if _client is None:
        try:
            from config import config
            api_key = config['openai']['api_key']
        except ImportError:
            api_key = os.getenv("OPENAI_API_KEY")
        
        _client = OpenAI(api_key=api_key)
    
    return _client

