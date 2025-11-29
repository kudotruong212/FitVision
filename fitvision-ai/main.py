# main.py
# FastAPI application entry point

from fastapi import FastAPI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import config to validate environment
try:
    from config import config
    from config.validateEnv import ensure_env_validated
    ensure_env_validated()
except ImportError:
    # Fallback if config module not available
    import os
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set. AI service may not work properly.")

# Create FastAPI app
app = FastAPI()

# Setup middleware
from middleware.cors import setup_cors
setup_cors(app)

# Register routes
from routes import register_routes
register_routes(app)

# Optional: Run with uvicorn if executed directly
if __name__ == "__main__":
    import uvicorn
    try:
        from config import config
        port = config['server']['port']
        host = config['server']['host']
    except ImportError:
        import os
        port = int(os.getenv("PORT", "8001"))
        host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(app, host=host, port=port)
