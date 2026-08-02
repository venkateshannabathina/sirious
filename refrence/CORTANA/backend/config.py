"""Runtime configuration and filesystem boundaries for CORTANA."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

FRONTEND_DIR = BASE_DIR / "frontend"
CC3_MODEL_DIR = BASE_DIR / "model" / "cc3"
DATA_DIR = BASE_DIR / "data"
AUDIO_DIR = BASE_DIR / "temp_audio"
WORLD_CONFIG_PATH = DATA_DIR / "world.json"

for directory in (FRONTEND_DIR, DATA_DIR, AUDIO_DIR):
    directory.mkdir(parents=True, exist_ok=True)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
if GROQ_API_KEY == "your_groq_api_key_here":
    GROQ_API_KEY = ""

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
DEFAULT_VOICE = os.environ.get("CORTANA_VOICE", "en-US-EmmaNeural")

HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8005"))
RELOAD = os.environ.get("CORTANA_RELOAD", "").lower() in {"1", "true", "yes"}

_local_origins = (
    "http://127.0.0.1:8005",
    "http://127.0.0.1:8006",
    "http://localhost:8005",
    "http://localhost:8006",
)
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORTANA_CORS_ORIGINS", ",".join(_local_origins)).split(",")
    if origin.strip()
]

