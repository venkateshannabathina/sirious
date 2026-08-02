"""Compatibility entry point for the modular CORTANA backend."""

from backend.config import HOST, PORT, RELOAD
from backend.main import app

__all__ = ["app"]


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host=HOST,
        port=PORT,
        reload=RELOAD,
    )

