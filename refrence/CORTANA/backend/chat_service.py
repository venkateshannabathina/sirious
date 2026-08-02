"""Provider routing, emotional response generation, and speech orchestration."""

from __future__ import annotations

import asyncio
import glob
import json
import time
import uuid
from pathlib import Path

from groq import Groq

from .config import (
    AUDIO_DIR,
    DEFAULT_VOICE,
    GROQ_API_KEY,
    GROQ_MODEL,
    OPENAI_API_KEY,
    OPENAI_MODEL,
)
from .lip_sync import synthesize_speech_with_timing
from .schemas import ChatRequest


SYSTEM_PROMPT = """
You are a real-time 3D companion chatbot named CORTANA.
Respond to the user's message and automatically control voice emotion, speaking style, and expressions.
Return strictly valid JSON matching the schema below. Do not add markdown or any text outside the JSON object.

{
  "response_text": "Natural spoken response",
  "emotion": "Neutral | Happy | Excited | Calm | Sad | Empathetic | Curious | Confident | Serious | Surprised",
  "emotion_intensity": 0.8,
  "speaking_rate": 1.0,
  "pitch_shift": 0.0,
  "volume": 1.0,
  "pause_markers": [],
  "facial_expressions": [
    {
      "expression": "exact recipe id",
      "intensity": 0.8,
      "duration_ms": 2400,
      "delay_ms": 0
    }
  ],
  "lip_sync_style": "standard",
  "transition_duration_ms": 500,
  "voice_style": "default"
}

Choose one primary facial recipe for communicative intent, not only sentiment.
Primary recipe ids include: calm, professional, confident, soft_smile,
genuine_smile, polite_smile, playful_grin, smirk, proud, relief, delight,
excitement, laugh, curious, interested, fascinated, analytical, concentrating,
remembering, calculating, confused, questioning, skeptical, realization,
listening, concern, sympathy, compassion, reassurance, disappointed, regret,
lonely, heartbroken, worry, comforting, irritated, frustrated, annoyed,
disapproval, stern, determined, controlled_anger, outrage, nervous, startled,
shock, alarm, anxiety, uneasy, panic, suspicious, reluctant, greeting,
encouraging, flirty, affectionate, respectful, shy, and embarrassed.

You may add up to two secondary micro recipes with delay_ms between 100 and 1800.
Micro recipe ids include: eyebrow_twitch, brow_flash, lip_twitch, lip_press,
smile_leak, nose_wrinkle, eye_widen, squint, chin_tension, jaw_clench,
cheek_twitch, nostril_flare, lip_purse, lower_lip_bite, micro_frown, eye_dart,
tiny_inhale, tiny_swallow, forehead_wrinkle, and head_freeze. Keep micro
intensities subtle, usually 0.25 to 0.7, and avoid contradictory combinations.

Keep speaking_rate between 0.8 and 1.2, pitch_shift between -5.0 and +5.0 Hz,
and volume between 0.5 and 1.0. Make the response natural, concise, and context-aware.
""".strip()

FALLBACK_TEXT = (
    "I can't reach my language service right now. "
    "Please check the configured provider key and try again."
)

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
if groq_client is None:
    print("[chat] GROQ_API_KEY is not configured; Groq requests will use an available fallback.")


def cleanup_old_audio(max_age_seconds: int = 600) -> None:
    """Remove transient speech files after their short playback window."""
    try:
        now = time.time()
        for filename in glob.glob(str(AUDIO_DIR / "*.mp3")):
            if now - Path(filename).stat().st_mtime > max_age_seconds:
                Path(filename).unlink(missing_ok=True)
    except OSError as error:
        print(f"[audio] Cleanup failed: {error}")


def _request_openai(message: str, api_key: str) -> dict:
    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
    )
    return json.loads(response.choices[0].message.content)


def _request_groq(message: str) -> dict:
    if groq_client is None:
        raise RuntimeError("Groq is not configured.")
    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
    )
    return json.loads(response.choices[0].message.content)


async def request_structured_response(chat_request: ChatRequest) -> dict:
    """Run synchronous provider clients away from the FastAPI event loop."""
    openai_key = chat_request.api_key.strip() or OPENAI_API_KEY
    if chat_request.provider == "openai" and openai_key:
        return await asyncio.to_thread(_request_openai, chat_request.message, openai_key)
    if groq_client is not None:
        return await asyncio.to_thread(_request_groq, chat_request.message)
    if openai_key:
        return await asyncio.to_thread(_request_openai, chat_request.message, openai_key)
    raise RuntimeError("No language provider is configured.")


def _edge_tts_controls(llm_data: dict) -> tuple[str, str]:
    speaking_rate = max(0.8, min(1.2, float(llm_data.get("speaking_rate", 1.0))))
    pitch_shift = max(-5.0, min(5.0, float(llm_data.get("pitch_shift", 0.0))))
    rate_percent = int(round((speaking_rate - 1.0) * 100))
    pitch_value = int(round(pitch_shift))
    return (
        f"{rate_percent:+}%" if rate_percent else "+0%",
        f"{pitch_value:+}Hz" if pitch_value else "+0Hz",
    )


async def _attach_speech(
    llm_data: dict,
    *,
    voice_name: str,
) -> dict:
    response_text = str(llm_data.get("response_text", "")).strip()
    if not response_text:
        raise ValueError("The language provider returned an empty response_text.")

    rate, pitch = _edge_tts_controls(llm_data)
    audio_filename = f"{uuid.uuid4()}.mp3"
    audio_path = AUDIO_DIR / audio_filename
    lip_sync = await synthesize_speech_with_timing(
        response_text,
        audio_path,
        voice_name or DEFAULT_VOICE,
        rate=rate,
        pitch=pitch,
    )
    result = dict(llm_data)
    result["audio_url"] = f"/api/audio/{audio_filename}"
    result["lip_sync"] = lip_sync
    return result


async def generate_chat_response(chat_request: ChatRequest) -> dict:
    cleanup_old_audio()
    try:
        llm_data = await request_structured_response(chat_request)
        return await _attach_speech(llm_data, voice_name=chat_request.voice_name)
    except Exception as error:
        print(f"[chat] Provider request failed: {error}")

    fallback = {
        "response_text": FALLBACK_TEXT,
        "emotion": "Sad",
        "emotion_intensity": 0.8,
        "speaking_rate": 1.0,
        "pitch_shift": 0.0,
        "volume": 1.0,
        "pause_markers": [],
        "facial_expressions": [{"expression": "sad", "intensity": 0.5}],
        "lip_sync_style": "standard",
        "transition_duration_ms": 420,
        "voice_style": "default",
        "audio_url": None,
        "lip_sync": None,
        "error": "Language service unavailable.",
    }
    try:
        return await _attach_speech(fallback, voice_name=chat_request.voice_name)
    except Exception as error:
        print(f"[audio] Fallback speech failed: {error}")
        return fallback
