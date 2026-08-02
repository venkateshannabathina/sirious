from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

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
    role: Literal["user", "assistant", "system"]
    content: str = Field(min_length=1, max_length=20_000)


class ChatRequest(BaseModel):
    provider: Provider = "demo"
    model: str | None = Field(default=None, max_length=120)
    messages: list[ChatMessage] = Field(min_length=1, max_length=40)


class ChatResponse(BaseModel):
    provider: Provider
    model: str
    message: str


app = FastAPI(title="Agentic Architecture Chat Lab", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/api/config")
async def config() -> dict[str, object]:
    return {
        "providers": {
            "demo": True,
            **{provider: bool(os.getenv(key_name, "").strip()) for provider, key_name in KEY_NAMES.items()},
        },
        "models": DEFAULT_MODELS,
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    model = request.model or DEFAULT_MODELS[request.provider]
    try:
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
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Provider request failed: {exc}") from exc

    return ChatResponse(provider=request.provider, model=model, message=answer)


app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
