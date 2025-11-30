# config/settings.py
# Centralized configuration for AI service

import os
from .validateEnv import ensure_env_validated

# Validate environment on import
ensure_env_validated()

config = {
    'server': {
        'port': int(os.getenv('PORT', '8001')),
        'host': os.getenv('HOST', '0.0.0.0'),
    },
    'openai': {
        'api_key': os.getenv('OPENAI_API_KEY'),
    },
    'logging': {
        'level': os.getenv('LOG_LEVEL', 'info'),
    },
}


