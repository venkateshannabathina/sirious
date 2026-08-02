#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PROJECT_DIR}/.venv/bin/python"
SIRIOUS_HOST="${HOST:-127.0.0.1}"
SIRIOUS_PORT="${PORT:-8005}"

if [[ ! -x "${PYTHON_BIN}" ]]; then
    echo "Missing .venv. Run: python3 -m venv .venv && .venv/bin/pip install -r requirements.txt"
    exit 1
fi

echo "Sirious viewer: http://${SIRIOUS_HOST}:${SIRIOUS_PORT}"
exec "${PYTHON_BIN}" -m uvicorn app:app --host "${SIRIOUS_HOST}" --port "${SIRIOUS_PORT}"
