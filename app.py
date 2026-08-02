"""Sirious high-fidelity Three.js model viewer."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "frontend"
ASSETS_DIR = BASE_DIR / "assets"

app = FastAPI(title="Sirious CC3 Viewer", version="0.1.0")


@app.middleware("http")
async def prevent_viewer_shell_caching(request, call_next):
    """Always deliver the current testing UI while preserving heavy asset caching."""
    response = await call_next(request)
    if request.url.path in {"/", "/index.html", "/app.js", "/style.css"}:
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


app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
