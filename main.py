"""FanZone AI — Main Entry Point

Serves BOTH:
  - ADK Web UI at / (interactive chat with agent graph)
  - REST API at /api/* (programmatic access)

Deployment: Cloud Run via `uvicorn main:app`
"""

import os
from pathlib import Path

# Load .env file if present (local dev)
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())

# Use API key if set, otherwise fall back to Vertex AI (ADC auth)
if not os.environ.get("GOOGLE_API_KEY"):
    os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "TRUE")
    os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "us-central1")

from google.adk.cli.fast_api import get_fast_api_app
from api.routes import router

# Create the ADK web app (serves UI + agent chat endpoints)
app = get_fast_api_app(
    agents_dir=".",
    web=True,
    host="0.0.0.0",
    port=8080,
    allow_origins=["*"],
)

# Mount our custom REST API under /api
app.include_router(router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "fanzone-ai"}


@app.get("/api")
async def api_root():
    return {
        "name": "FanZone AI",
        "version": "1.0.0",
        "tagline": "Where cricket fans connect through shared match experiences",
        "docs": "Visit / for ADK Web UI, /api/* for REST endpoints",
        "data_source": "CricAPI (CricketData.org) — Real-time cricket data",
        "endpoints": [
            "GET  /health",
            "GET  /api/live-matches",
            "GET  /api/live-scores",
            "GET  /api/match/{match_id}",
            "GET  /api/recent-matches",
            "GET  /api/ipl-matches",
            "GET  /api/series/search?q=IPL",
            "GET  /api/team/{team_code}",
            "GET  /api/player/search?q=Virat",
            "POST /api/fan/register",
            "GET  /api/fan/{user_id}",
            "GET  /api/fan/team/{team_code}",
            "POST /api/discussion/create",
            "GET  /api/discussion/match/{match_id}",
            "POST /api/discussion/{disc_id}/reply",
            "POST /api/discussion/{disc_id}/react",
            "POST /api/connection/create",
            "GET  /api/connection/{user_id}",
            "POST /api/chat",
        ],
    }
