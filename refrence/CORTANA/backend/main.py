"""FastAPI application assembly for CORTANA."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .chat_service import generate_chat_response
from .config import AUDIO_DIR, CC3_MODEL_DIR, CORS_ORIGINS, FRONTEND_DIR
from .schemas import ChatRequest, WorldDocument, serialize_model
from .world_store import DEFAULT_WORLD, load_world_document, save_world_document


app = FastAPI(
    title="CORTANA 3D Companion",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health() -> JSONResponse:
    return JSONResponse(
        content={
            "status": "ok",
            "frontend": FRONTEND_DIR.exists(),
            "character": (CC3_MODEL_DIR / "cc3_master.glb").exists(),
        }
    )


@app.get("/api/world")
async def get_world() -> JSONResponse:
    try:
        document = serialize_model(WorldDocument(**load_world_document()))
        return JSONResponse(content=document)
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"World document is invalid: {error}") from error


@app.put("/api/world")
async def put_world(world_document: WorldDocument) -> JSONResponse:
    document = serialize_model(world_document)
    save_world_document(document)
    return JSONResponse(content={"saved": True, "world": document})


@app.delete("/api/world")
async def reset_world() -> JSONResponse:
    save_world_document(DEFAULT_WORLD)
    return JSONResponse(content={"reset": True, "world": DEFAULT_WORLD})


@app.post("/api/chat")
async def chat(chat_request: ChatRequest) -> JSONResponse:
    return JSONResponse(content=await generate_chat_response(chat_request))


@app.get("/api/audio/{filename}")
async def get_audio(filename: str) -> FileResponse:
    if Path(filename).name != filename or not filename.lower().endswith(".mp3"):
        raise HTTPException(status_code=400, detail="Invalid audio filename")
    file_path = AUDIO_DIR / filename
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path, media_type="audio/mpeg", filename=filename)


if CC3_MODEL_DIR.exists():
    app.mount("/model/cc3", StaticFiles(directory=CC3_MODEL_DIR), name="cc3-model")
else:
    print(f"[startup] CC3 model directory not found: {CC3_MODEL_DIR}")

if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:
    print(f"[startup] Frontend directory not found: {FRONTEND_DIR}")

