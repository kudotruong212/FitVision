# config/validateEnv.py
# Validates all required environment variables on startup

import os
import sys
from typing import List, Tuple

REQUIRED_VARS = {
    'OPENAI_API_KEY': 'OpenAI API key is required for AI service',
}

OPTIONAL_VARS = {
    'PORT': '8001',
    'HOST': '0.0.0.0',
    'LOG_LEVEL': 'info',
}


def validate_env() -> Tuple[List[str], List[str]]:
    """
    Validate environment variables.
    Returns: (errors, warnings)
    """
    errors = []
    warnings = []

    # Check required variables
    for var_name, error_message in REQUIRED_VARS.items():
        if not os.getenv(var_name):
            errors.append(f"{var_name}: {error_message}")

    # Validate specific formats
    openai_key = os.getenv('OPENAI_API_KEY')
    if openai_key and not openai_key.startswith('sk-'):
        warnings.append('OPENAI_API_KEY: Does not start with "sk-", may be invalid')

    # Set defaults for optional variables
    for var_name, default_value in OPTIONAL_VARS.items():
        if not os.getenv(var_name):
            os.environ[var_name] = default_value

    return errors, warnings


def ensure_env_validated():
    """Call this at startup to validate environment."""
    errors, warnings = validate_env()

    if errors:
        print('❌ Environment validation failed:', file=sys.stderr)
        for err in errors:
            print(f'   - {err}', file=sys.stderr)
        sys.exit(1)

    if warnings:
        print('⚠️  Environment validation warnings:')
        for warn in warnings:
            print(f'   - {warn}')

    print('✅ Environment variables validated')


if __name__ == '__main__':
    ensure_env_validated()



