"""Sirious high-fidelity Three.js model viewer."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles


BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
ASSETS_DIR = PUBLIC_DIR / "assets"
IS_VERCEL = os.getenv("VERCEL") == "1"

VIEWER_CONTENT_SECURITY_POLICY = "; ".join(
    (
        "default-src 'self'",
        "base-uri 'none'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
        "connect-src 'self' blob: http://127.0.0.1:8010 http://localhost:8010",
        "form-action 'self'",
    )
)

app = FastAPI(title="Sirious CC3 Viewer", version="0.1.0")


@app.middleware("http")
async def prevent_viewer_shell_caching(request, call_next):
    """Always deliver the current testing UI while preserving heavy asset caching."""
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = VIEWER_CONTENT_SECURITY_POLICY
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path in {"/", "/index.html", "/app.js", "/chat.js", "/lip-sync.js", "/style.css"}:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.get("/api/health")
def health() -> JSONResponse:
    model = ASSETS_DIR / "models" / "cc3_master.glb"
    return JSONResponse(
        {
            "status": "ok",
            "viewer": "sirious-cc3",
            "model_ready": model.exists(),
            "model_bytes": model.stat().st_size if model.exists() else 0,
        }
    )


@app.get("/", include_in_schema=False)
def viewer() -> FileResponse:
    return FileResponse(PUBLIC_DIR / "index.html")


# Vercel serves public/** from its CDN. Mounting it through FastAPI would route
# the 81 MB GLB through a Function and exceed Vercel's 4.5 MB response limit.
if not IS_VERCEL:
    app.mount("/", StaticFiles(directory=PUBLIC_DIR, html=True), name="frontend")
