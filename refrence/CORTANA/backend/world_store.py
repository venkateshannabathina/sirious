"""Atomic persistence for the editable CORTANA world document."""

from __future__ import annotations

import json
import os
import tempfile
from copy import deepcopy

from .config import DATA_DIR, WORLD_CONFIG_PATH


DEFAULT_WORLD = {
    "version": 1,
    "environment": {
        "background": "#ffffff",
        "ground_color": "#ffffff",
        "tile_scale": 30,
    },
    "objects": [],
}


def load_world_document() -> dict:
    if not WORLD_CONFIG_PATH.exists():
        return deepcopy(DEFAULT_WORLD)
    try:
        with WORLD_CONFIG_PATH.open("r", encoding="utf-8") as world_file:
            return json.load(world_file)
    except (OSError, json.JSONDecodeError) as error:
        print(f"[world] Unable to read {WORLD_CONFIG_PATH.name}: {error}")
        return deepcopy(DEFAULT_WORLD)


def save_world_document(document: dict) -> None:
    descriptor, temporary_path = tempfile.mkstemp(
        prefix="world-",
        suffix=".json",
        dir=DATA_DIR,
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as world_file:
            json.dump(document, world_file, indent=2)
            world_file.write("\n")
        os.replace(temporary_path, WORLD_CONFIG_PATH)
    finally:
        if os.path.exists(temporary_path):
            os.remove(temporary_path)

