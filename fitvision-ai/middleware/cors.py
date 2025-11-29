# middleware/cors.py
# CORS middleware setup

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List


def setup_cors(app: FastAPI, allow_origins: List[str] = None):
    """
    Setup CORS middleware for FastAPI app.
    
    Args:
        app: FastAPI application instance
        allow_origins: List of allowed origins (default: ["*"])
    """
    if allow_origins is None:
        allow_origins = ["*"]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

