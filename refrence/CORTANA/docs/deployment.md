# CORTANA deployment

## Current status

CORTANA currently runs as one FastAPI application that also serves the frontend and CC3 runtime assets. The root `app.py` is a compatibility entry point for the current `backend` package. Python dependencies are pinned in `requirements.txt`, including OpenAI. A container, CI workflow, formal lock artifact, and persistent storage adapter have not been added yet.

The backend now includes:

- A health route at `/api/health`.
- A restricted `/model/cc3` static mount instead of exposing all of `model`.
- Configurable CORS origins.
- Reload disabled by default.
- Validated audio filenames.
- Provider client calls moved off the async event loop with `asyncio.to_thread`.

## Current prerequisites

- Python 3 with packages from `requirements.txt`.
- A modern WebGL-capable browser.
- Network access for the selected LLM provider and Edge TTS.
- `GROQ_API_KEY` and/or `OPENAI_API_KEY`.

## Current environment variables

| Variable | Required | Current use |
| --- | --- | --- |
| `GROQ_API_KEY` | Required for Groq chat | Initializes the Groq client |
| `OPENAI_API_KEY` | Required for server-side OpenAI fallback | Used when the frontend does not submit a key |
| `GROQ_MODEL` | Optional | Defaults to `llama-3.3-70b-versatile` |
| `OPENAI_MODEL` | Optional | Defaults to `gpt-4o-mini` |
| `CORTANA_VOICE` | Optional | Defaults to `en-US-EmmaNeural` |
| `HOST` | Optional | Defaults to `127.0.0.1` |
| `PORT` | Optional | Defaults to 8005 |
| `CORTANA_RELOAD` | Optional | Enables development reload for `1`, `true`, or `yes` |
| `CORTANA_CORS_ORIGINS` | Optional | Comma-separated allowed origins; defaults to local ports 8005 and 8006 |

Never commit `.env`. Use `.env.example` only for names and safe placeholders.

## Current launch behavior

`./run.sh` resolves the project directory, uses `.venv/bin/python` when available, falls back to `python3`, and directly starts `backend.main:app` through Uvicorn without reload.

The equivalent explicit command is:

```bash
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8005}"
```

The root `python3 app.py` compatibility path remains available and honors `HOST`, `PORT`, and `CORTANA_RELOAD`.

## Required runtime assets

The browser currently requests:

- `frontend/index.html`
- `frontend/style.css`
- `frontend/app.js`
- the runtime libraries referenced by `frontend/index.html`
- `frontend/img/royal_esplanade_1k.hdr` when material preview is used
- `model/cc3/cc3_master.glb`
- all ten files under `model/cc3/animations`

The files under `frontend/styles` are the active additive UI foundation and are required runtime assets. They load after the legacy compatibility stylesheet in this order: tokens, shell, Studio, rig, responsive.

The raw files under `model/test` are Blender/export inputs and are not required by the browser. They should remain outside the production artifact. The server now mounts only `model/cc3` at the preserved `/model/cc3/*` URL; this boundary still needs release verification.

## Mutable storage

Current local writes:

- `data/world.json`
- `temp_audio/*.mp3`

These paths may disappear on a restart when hosted on an ephemeral filesystem. A deployment must provide one of:

1. A persistent volume and configurable data/audio directories.
2. A database or object-store implementation behind the same service contract.

Generated speech is transient and should have bounded retention. World data is durable user state and requires backup and atomic writes.

## Production hardening backlog

The following items are not implemented yet:

- Add a reproducible lock artifact and automated dependency update policy.
- Add provider and TTS timeouts.
- Add structured logs and request correlation.
- Return an observable degraded-service state when chat falls back.
- Add long-lived cache headers for immutable model and animation assets.
- Generate hashed browser bundles instead of handwritten cache query strings.
- Host the font locally or use a system stack.
- Configure persistent world storage and bounded audio cleanup.
- Add TLS and secret management at the hosting layer.

## Planned artifact boundary

The final deployable artifact should include:

```text
application Python package
frontend build output
runtime vendor dependencies
model/cc3/cc3_master.glb
model/cc3/animations/*
required image/HDR assets
default world seed
```

It should exclude:

```text
.env
virtual environments
Python and browser caches
model/test
Blender source textures
generated diagnostic images/reports
temporary audio
local test output
manual experiments
```

## Deployment verification

Before release:

1. Start the exact production command in a clean environment.
2. Verify `/api/health` reports the frontend and character asset ready.
3. Verify `/` and every required static asset returns successfully.
4. Confirm the character becomes visible and the loading overlay exits.
5. Confirm all ten animation assets load without browser errors.
6. Verify `GET` and `PUT /api/world` against persistent storage.
7. Verify one chat/TTS round trip for every enabled provider.
8. Verify generated audio can be fetched and later expires.
9. Confirm no source asset, secret, diagnostic, or environment directory is publicly served.
10. Run the complete `docs/qa-checklist.md`.
