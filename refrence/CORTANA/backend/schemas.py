"""Validated API contracts shared by CORTANA routes and services."""

from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field

from .config import DEFAULT_VOICE


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4_000)
    voice_name: str = DEFAULT_VOICE
    provider: Literal["groq", "openai"] = "groq"
    api_key: str = ""


class WorldTransform(BaseModel):
    position: List[float] = Field(min_length=3, max_length=3)
    rotation: List[float] = Field(min_length=3, max_length=3)
    scale: List[float] = Field(min_length=3, max_length=3)


class WorldObject(BaseModel):
    id: str
    name: str
    type: Literal["box", "sphere", "cylinder"]
    color: str
    visible: bool = True
    collision: bool = True
    transform: WorldTransform


class WorldEnvironment(BaseModel):
    background: str = "#ffffff"
    ground_color: str = "#ffffff"
    tile_scale: float = 30


class WorldDocument(BaseModel):
    version: int = 1
    environment: WorldEnvironment = Field(default_factory=WorldEnvironment)
    objects: List[WorldObject] = Field(default_factory=list)


def serialize_model(model: BaseModel) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()

