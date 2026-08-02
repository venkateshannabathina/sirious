#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_BIN="${PROJECT_DIR}/.venv/bin/python"

if [[ ! -x "${PYTHON_BIN}" ]]; then
    PYTHON_BIN="python3"
fi

CORTANA_HOST="${HOST:-127.0.0.1}"
CORTANA_PORT="${PORT:-8005}"

echo "Starting CORTANA on http://${CORTANA_HOST}:${CORTANA_PORT}"
exec "${PYTHON_BIN}" -m uvicorn backend.main:app \
    --host "${CORTANA_HOST}" \
    --port "${CORTANA_PORT}"
