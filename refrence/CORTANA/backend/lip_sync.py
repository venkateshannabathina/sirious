"""CC3 viseme mapping and Edge TTS timing generation."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable

import edge_tts


VISEME_RULES = (
    ("tion", "V_Affricate", None),
    ("tch", "V_Affricate", None),
    ("dge", "V_Affricate", None),
    ("igh", "V_Wide", None),
    ("sh", "V_Affricate", None),
    ("ch", "V_Affricate", None),
    ("zh", "V_Affricate", None),
    ("th", "V_Lip_Open", "V_Tongue_Out"),
    ("ph", "V_Dental_Lip", None),
    ("oo", "V_Tight_O", None),
    ("ou", "V_Tight_O", None),
    ("ow", "V_Tight_O", None),
    ("wh", "V_Tight_O", None),
    ("ee", "V_Wide", None),
    ("ea", "V_Wide", None),
    ("ey", "V_Wide", None),
    ("qu", "V_Tight_O", None),
)

VISEME_CHARACTERS = {
    "a": ("V_Open", None),
    "e": ("V_Wide", None),
    "i": ("V_Wide", None),
    "o": ("V_Tight_O", None),
    "u": ("V_Tight_O", None),
    "y": ("V_Wide", None),
    "p": ("V_Explosive", None),
    "b": ("V_Explosive", None),
    "m": ("V_Explosive", None),
    "f": ("V_Dental_Lip", None),
    "v": ("V_Dental_Lip", None),
    "w": ("V_Tight_O", None),
    "r": ("V_Tight", None),
    "j": ("V_Affricate", None),
    "l": ("V_Lip_Open", "V_Tongue_Raise"),
    "c": ("V_Lip_Open", None),
    "d": ("V_Lip_Open", "V_Tongue_up"),
    "g": ("V_Lip_Open", None),
    "h": ("V_Lip_Open", None),
    "k": ("V_Lip_Open", None),
    "n": ("V_Lip_Open", "V_Tongue_up"),
    "q": ("V_Tight_O", None),
    "s": ("V_Lip_Open", None),
    "t": ("V_Lip_Open", "V_Tongue_up"),
    "x": ("V_Affricate", None),
    "z": ("V_Affricate", None),
}


def word_to_visemes(word: str) -> list[tuple[str, str | None]]:
    """Convert a written word into the exact CC3 viseme vocabulary."""
    normalized = re.sub(r"[^a-z']", "", word.lower())
    result: list[tuple[str, str | None]] = []
    index = 0
    while index < len(normalized):
        if (
            normalized[index] == "e"
            and index == len(normalized) - 1
            and len(normalized) > 2
            and normalized not in {"the", "she"}
        ):
            index += 1
            continue

        matched = False
        for token, viseme, tongue in VISEME_RULES:
            if normalized.startswith(token, index):
                result.append((viseme, tongue))
                index += len(token)
                matched = True
                break
        if matched:
            continue

        mapped = VISEME_CHARACTERS.get(normalized[index])
        if mapped:
            result.append(mapped)
        index += 1

    collapsed: list[tuple[str, str | None]] = []
    for item in result:
        if not collapsed or collapsed[-1] != item:
            collapsed.append(item)
    return collapsed or [("V_Lip_Open", None)]


def build_lip_sync_timeline(boundaries: Iterable[dict]) -> dict:
    cues: list[dict] = []
    for boundary in boundaries:
        start = max(0.0, boundary["offset"] / 10_000_000)
        duration = max(0.06, boundary["duration"] / 10_000_000)
        visemes = word_to_visemes(boundary.get("text", ""))
        weights = [
            0.72 if viseme in ("V_Explosive", "V_Dental_Lip", "V_Affricate") else 1.0
            for viseme, _ in visemes
        ]
        weight_total = sum(weights) or 1.0
        cursor = start
        for position, ((viseme, tongue), weight) in enumerate(zip(visemes, weights)):
            cue_duration = duration * weight / weight_total
            cue = {
                "start": round(cursor, 4),
                "end": round(cursor + cue_duration, 4),
                "viseme": viseme,
                "strength": 0.9 if position in (0, len(visemes) - 1) else 1.0,
            }
            if tongue:
                cue["tongue"] = tongue
            cues.append(cue)
            cursor += cue_duration

    return {
        "version": 1,
        "source": "edge-word-boundary",
        "duration": round(max((cue["end"] for cue in cues), default=0.0), 4),
        "cues": cues,
    }


async def synthesize_speech_with_timing(
    text: str,
    audio_path: Path,
    voice: str,
    rate: str = "+0%",
    pitch: str = "+0Hz",
) -> dict:
    boundaries: list[dict] = []
    communicate = edge_tts.Communicate(
        text=text,
        voice=voice,
        rate=rate,
        pitch=pitch,
        boundary="WordBoundary",
    )
    with audio_path.open("wb") as audio_file:
        async for message in communicate.stream():
            if message["type"] == "audio":
                audio_file.write(message["data"])
            elif message["type"] == "WordBoundary":
                boundaries.append(message)
    return build_lip_sync_timeline(boundaries)

