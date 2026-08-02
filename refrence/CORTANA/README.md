# CORTANA Companion Studio

CORTANA is a browser-based CC3 character companion and lightweight playable world. It combines a Three.js character viewport, baked locomotion, camera and material controls, conversational voice output, timed lip sync, facial posing, photo/video capture, and a persistent scene editor.

## Product structure

```text
CORTANA
├── Viewport
│   ├── Character, materials and animation
│   ├── Camera, locomotion and collision
│   └── Conversation, voice and lip sync
└── Studio
    ├── Photo Booth
    │   ├── Animation
    │   ├── Face
    │   ├── Ultimate Face Rig
    │   └── PNG / WebM capture
    └── World Editor
        ├── Primitive creation
        ├── Scene hierarchy
        ├── Object inspector
        ├── Environment
        └── Persistent save
```

The production UI uses monochrome application chrome. Character materials and viewport content keep their natural colors.

## Requirements

- Python 3.11 or newer
- A modern browser with WebGL 2
- The CC3 runtime assets under `model/cc3/`
- A Groq or OpenAI API key for generated conversation

Edge TTS generates speech and word-boundary timing. The character and editor still load when no language-provider key is configured.

## Local setup

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
cp .env.example .env
./run.sh
```

Open [http://127.0.0.1:8005/](http://127.0.0.1:8005/). To use a different port:

```bash
PORT=8006 ./run.sh
```

Never commit `.env` or enter a production secret into source code. The browser API-key field is an optional per-request override and is not persisted.

## Repository map

```text
backend/                 FastAPI assembly, schemas and services
frontend/                Static application shell and Three.js runtime
frontend/styles/         Monochrome design-system layers
model/cc3/               Public runtime character and baked animations
model/test/              Local source/reference assets; not publicly mounted
data/world.json          Current editable world document
temp_audio/              Short-lived generated speech files
tools/                   Offline CC3 export and animation-baking utilities
tools/archive/           Preserved one-off diagnostics; excluded from runtime
tests/                   Automated API, world-store and lip-sync checks
docs/                    Architecture, feature map, UI tree and QA guidance
artifacts/               Ignored local diagnostics and sample outputs
app.py                   Compatibility entry point
run.sh                   Production-style local launcher
```

Only `model/cc3/` is mounted at `/model/cc3`. Raw Blender, Mixamo, diagnostic and test assets are intentionally outside the public static boundary.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Runtime readiness |
| `GET` | `/api/world` | Load the saved world |
| `PUT` | `/api/world` | Atomically save the world |
| `DELETE` | `/api/world` | Reset the world document |
| `POST` | `/api/chat` | Structured response, speech and lip-sync timeline |
| `GET` | `/api/audio/{filename}` | Generated MP3 playback |

Interactive API documentation is available at `/api/docs`.

## Validation

```bash
node --check frontend/app.js
python3 -m py_compile app.py backend/*.py
python3 -m unittest discover -s tests -p 'test_*.py'
```

Browser release checks must cover the real WebGL canvas—not only HTTP status. See [docs/qa-checklist.md](docs/qa-checklist.md).

## Deployment notes

Run without auto-reload:

```bash
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8005
```

Configure allowed cross-origin clients with `CORTANA_CORS_ORIGINS`. Same-origin deployments need no additional browser origin. Mount `data/` and `temp_audio/` on appropriate persistent and temporary storage respectively. See [docs/deployment.md](docs/deployment.md) for the release checklist.
