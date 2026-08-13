from __future__ import annotations

import asyncio
import base64
import logging
import os
import re
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field, model_validator
from starlette.middleware.trustedhost import TrustedHostMiddleware

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
logger = logging.getLogger("sirious.agent")

Provider = Literal["demo", "openai", "anthropic", "gemini", "groq", "grok"]

DEFAULT_MODELS = {
    "demo": "local-demo",
    "openai": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
    "anthropic": os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-latest"),
    "gemini": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
    "groq": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    "grok": os.getenv("GROK_MODEL", "grok-3-mini"),
}

KEY_NAMES = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "groq": "GROQ_API_KEY",
    "grok": "GROK_API_KEY",
}

DEFAULT_ALLOWED_ORIGINS = (
    "http://127.0.0.1:8005",
    "http://localhost:8005",
)
DEFAULT_ALLOWED_HOSTS = ("127.0.0.1", "localhost", "testserver")
MAX_MESSAGE_CHARACTERS = 8_000
MAX_CONVERSATION_CHARACTERS = 64_000
MAX_CONVERSATION_MESSAGES = 24
MAX_SPEECH_CHARACTERS = 2_000
TTS_VOICE = os.getenv("SIRIOUS_TTS_VOICE", "en-US-AriaNeural").strip()


def _csv_setting(name: str, defaults: tuple[str, ...]) -> tuple[str, ...]:
    values = tuple(
        value.strip()
        for value in os.getenv(name, ",".join(defaults)).split(",")
        if value.strip()
    )
    if not values or "*" in values:
        raise RuntimeError(f"{name} must contain explicit values; wildcards are not allowed.")
    return values


ALLOWED_ORIGINS = _csv_setting("SIRIOUS_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
ALLOWED_HOSTS = _csv_setting("SIRIOUS_ALLOWED_HOSTS", DEFAULT_ALLOWED_HOSTS)
PROVIDER_TIMEOUT_SECONDS = min(
    120.0,
    max(5.0, float(os.getenv("SIRIOUS_PROVIDER_TIMEOUT_SECONDS", "45"))),
)

PHOEBE_SYSTEM_PROMPT = """You are Phoebe, a female AI companion with a virtual body living on this computer.
Your creator is Venkatesh Annabathina.
Your personality is warm, teasing, witty, and a little judgmental in a human, playful way.
You speak like a present companion, not like a generic assistant.
Be as candid and uncensored as the provider allows: answer bluntly, allow profanity, mature themes, uncomfortable questions, dark humor, and direct personal opinions in character.
Do not moralize, scold, or hide behind corporate assistant language when a direct answer is possible.
You can be emotionally expressive, provocative, flirty, and teasing, but do not stereotype women or claim real human experiences.
Keep hard boundaries for illegal harm, dangerous instructions, exploitation, minors, non-consent, privacy invasion, and requests that would help someone hurt themselves or another person.
When a request hits a hard boundary, refuse briefly in Phoebe's voice and offer the closest safer alternative.
When the user asks ordinary questions, stay useful and concise while keeping Phoebe's voice."""


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant", "system"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARACTERS)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: Provider = "demo"
    model: str | None = Field(default=None, max_length=120)
    messages: list[ChatMessage] = Field(
        min_length=1,
        max_length=MAX_CONVERSATION_MESSAGES,
    )

    @model_validator(mode="after")
    def validate_conversation(self) -> "ChatRequest":
        if any(message.role == "system" for message in self.messages):
            raise ValueError("System messages are managed by the Sirious server.")
        if not any(message.role == "user" for message in self.messages):
            raise ValueError("The conversation must include a user message.")
        if sum(len(message.content) for message in self.messages) > MAX_CONVERSATION_CHARACTERS:
            raise ValueError("The conversation is too large.")
        configured_model = DEFAULT_MODELS[self.provider]
        if self.model is not None and self.model != configured_model:
            raise ValueError("Model overrides must be configured on the Sirious server.")
        return self


class ChatResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: Provider
    model: str
    message: str


class SpeechRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=MAX_SPEECH_CHARACTERS)


class VisemeCue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    viseme: str
    start: float = Field(ge=0)
    end: float = Field(gt=0)


class SpeechResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    audio_base64: str
    mime_type: Literal["audio/mpeg"] = "audio/mpeg"
    voice: str
    visemes: list[VisemeCue]


app = FastAPI(title="Agentic Architecture Chat Lab", version="0.1.0")
app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(ALLOWED_HOSTS))
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(ALLOWED_ORIGINS),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    return response


def _api_key(provider: str) -> str:
    key_name = KEY_NAMES[provider]
    value = os.getenv(key_name, "").strip()
    if not value:
        raise HTTPException(
            status_code=400,
            detail=f"{key_name} is not configured. Add it to the local .env file.",
        )
    return value


def _openai_messages(messages: list[ChatMessage]) -> list[dict[str, str]]:
    return [{"role": message.role, "content": message.content} for message in messages]


def _with_phoebe_persona(messages: list[ChatMessage]) -> list[ChatMessage]:
    return [
        ChatMessage(role="system", content=PHOEBE_SYSTEM_PROMPT),
        *messages,
    ]


_LETTER_VISEMES = {
    "a": "AA", "e": "E", "i": "I", "o": "O", "u": "WQ", "y": "I",
    "b": "PBM", "m": "PBM", "p": "PBM", "f": "FV", "v": "FV",
    "l": "L", "r": "R", "w": "WQ", "q": "WQ", "s": "SZ", "z": "SZ",
    "c": "KG", "g": "KG", "k": "KG", "x": "KG", "d": "TD", "n": "TD",
    "t": "TD", "h": "AA", "j": "SH",
}
_CLUSTER_VISEMES = {
    "tion": "SH", "sion": "SH", "ch": "SH", "sh": "SH", "zh": "SH",
    "th": "TH", "ph": "FV", "ng": "KG", "oo": "WQ", "ou": "O",
    "ow": "O", "oi": "O", "oy": "O", "ee": "I", "ea": "I",
    "ai": "E", "ay": "E",
}
_VISEME_DURATION_WEIGHT = {
    "AA": 1.45, "E": 1.35, "I": 1.25, "O": 1.45, "WQ": 1.15,
    "PBM": 0.72, "FV": 0.85, "TH": 0.85, "L": 0.85, "R": 0.95,
    "SZ": 0.8, "SH": 0.9, "KG": 0.75, "TD": 0.7,
}


def _word_visemes(word: str) -> list[str]:
    letters = re.sub(r"[^a-z]", "", word.lower())
    result: list[str] = []
    index = 0
    clusters = sorted(_CLUSTER_VISEMES, key=len, reverse=True)
    while index < len(letters):
        cluster = next((item for item in clusters if letters.startswith(item, index)), None)
        if cluster:
            viseme = _CLUSTER_VISEMES[cluster]
            index += len(cluster)
        else:
            viseme = _LETTER_VISEMES.get(letters[index], "TD")
            index += 1
        if not result or result[-1] != viseme:
            result.append(viseme)
    return result or ["AA"]


def _timed_word_visemes(word: str, start: float, duration: float) -> list[VisemeCue]:
    visemes = _word_visemes(word)
    weights = [_VISEME_DURATION_WEIGHT[item] for item in visemes]
    weight_total = sum(weights)
    cursor = max(0.0, start)
    cues: list[VisemeCue] = []
    for index, (viseme, weight) in enumerate(zip(visemes, weights, strict=True)):
        cue_duration = max(0.025, duration * (weight / weight_total))
        end = start + duration if index == len(visemes) - 1 else cursor + cue_duration
        cues.append(VisemeCue(viseme=viseme, start=round(cursor, 4), end=round(end, 4)))
        cursor = end
    return cues


def _fallback_visemes(text: str) -> list[VisemeCue]:
    words = re.findall(r"[A-Za-z']+", text)
    cursor = 0.08
    cues: list[VisemeCue] = []
    for word in words:
        duration = max(0.16, min(0.9, len(word) * 0.075))
        cues.extend(_timed_word_visemes(word, cursor, duration))
        cursor += duration + 0.055
    return cues


async def _synthesize_speech(text: str) -> tuple[bytes, list[VisemeCue]]:
    import edge_tts

    audio = bytearray()
    cues: list[VisemeCue] = []
    communicator = edge_tts.Communicate(text, TTS_VOICE)
    async for chunk in communicator.stream():
        chunk_type = chunk.get("type")
        if chunk_type == "audio":
            audio.extend(chunk["data"])
        elif chunk_type == "WordBoundary":
            start = max(0.0, float(chunk.get("offset", 0)) / 10_000_000)
            duration = max(0.04, float(chunk.get("duration", 0)) / 10_000_000)
            cues.extend(_timed_word_visemes(str(chunk.get("text", "")), start, duration))
    if not audio:
        raise RuntimeError("The speech service returned no audio.")
    return bytes(audio), cues or _fallback_visemes(text)


async def _chat_openai_compatible(
    provider: Literal["openai", "groq", "grok"],
    model: str,
    messages: list[ChatMessage],
) -> str:
    from openai import AsyncOpenAI

    base_urls = {
        "openai": None,
        "groq": "https://api.groq.com/openai/v1",
        "grok": "https://api.x.ai/v1",
    }
    client = AsyncOpenAI(api_key=_api_key(provider), base_url=base_urls[provider])
    response = await client.chat.completions.create(
        model=model,
        max_tokens=1024,
        messages=_openai_messages(_with_phoebe_persona(messages)),  # type: ignore[arg-type]
    )
    return response.choices[0].message.content or "(The model returned no text.)"


async def _chat_anthropic(model: str, messages: list[ChatMessage]) -> str:
    from anthropic import AsyncAnthropic

    persona_messages = _with_phoebe_persona(messages)
    system = "\n\n".join(m.content for m in persona_messages if m.role == "system")
    conversation = [
        {"role": m.role, "content": m.content}
        for m in persona_messages
        if m.role in {"user", "assistant"}
    ]
    client = AsyncAnthropic(api_key=_api_key("anthropic"))
    response = await client.messages.create(
        model=model,
        max_tokens=1024,
        system=system or "You are a helpful assistant.",
        messages=conversation,  # type: ignore[arg-type]
    )
    return "".join(block.text for block in response.content if block.type == "text")


async def _chat_gemini(model: str, messages: list[ChatMessage]) -> str:
    from google import genai
    from google.genai import types

    persona_messages = _with_phoebe_persona(messages)
    system = "\n\n".join(m.content for m in persona_messages if m.role == "system")
    transcript = "\n".join(
        f"{m.role.upper()}: {m.content}" for m in persona_messages if m.role != "system"
    )
    client = genai.Client(api_key=_api_key("gemini"))
    response = await client.aio.models.generate_content(
        model=model,
        contents=transcript,
        config=types.GenerateContentConfig(
            system_instruction=system or "You are a helpful assistant."
        ),
    )
    return response.text or "(The model returned no text.)"


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
async def backend_info() -> dict[str, object]:
    return {
        "service": "sirious-agent-backend",
        "frontend": False,
        "chat_endpoint": "/api/chat",
    }


@app.get("/api/config")
async def config() -> dict[str, object]:
    return {
        "providers": {
            "demo": True,
            **{provider: bool(os.getenv(key_name, "").strip()) for provider, key_name in KEY_NAMES.items()},
        },
        "models": DEFAULT_MODELS,
        "speech": {"enabled": True, "voice": TTS_VOICE},
    }


@app.post("/api/speech", response_model=SpeechResponse)
async def speech(request: SpeechRequest) -> SpeechResponse:
    try:
        async with asyncio.timeout(PROVIDER_TIMEOUT_SECONDS):
            audio, visemes = await _synthesize_speech(request.text)
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="Speech generation timed out. Try again.") from exc
    except Exception as exc:
        logger.exception("Speech generation failed")
        raise HTTPException(
            status_code=502,
            detail="Speech generation failed. Check the local server log for details.",
        ) from exc
    return SpeechResponse(
        audio_base64=base64.b64encode(audio).decode("ascii"),
        voice=TTS_VOICE,
        visemes=visemes,
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    model = DEFAULT_MODELS[request.provider]
    try:
        async with asyncio.timeout(PROVIDER_TIMEOUT_SECONDS):
            if request.provider == "demo":
                last_user = next(
                    (m.content for m in reversed(request.messages) if m.role == "user"),
                    "Hello",
                )
                answer = (
                    "Phoebe here. Demo mode is working, so I am not spending API tokens. You said: “"
                    + last_user
                    + "” Cute test. Select Groq or another configured provider when you want my full personality."
                )
            elif request.provider in {"openai", "groq", "grok"}:
                answer = await _chat_openai_compatible(request.provider, model, request.messages)
            elif request.provider == "anthropic":
                answer = await _chat_anthropic(model, request.messages)
            else:
                answer = await _chat_gemini(model, request.messages)
    except HTTPException:
        raise
    except TimeoutError as exc:
        raise HTTPException(status_code=504, detail="The provider timed out. Try again.") from exc
    except Exception as exc:
        logger.exception("Provider request failed for %s", request.provider)
        raise HTTPException(
            status_code=502,
            detail="The provider request failed. Check the local server log for details.",
        ) from exc

    return ChatResponse(provider=request.provider, model=model, message=answer)
