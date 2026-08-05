# Sirious Agent Backend

API-only multi-provider backend for the Sirious Three.js character interface. The character is Phoebe, a virtual companion created by Venkatesh Annabathina. It supports:

- Demo mode with no external calls or token usage
- OpenAI through the official OpenAI SDK
- Claude through the official Anthropic SDK
- Gemini through Google's current `google-genai` SDK
- Groq through its OpenAI-compatible API
- Grok through xAI's OpenAI-compatible API
- API keys kept on the server in a local `.env` file

## Start

```bash
source .venv/bin/activate
cp .env.example .env
uvicorn app:app --reload --port 8010
```

The Sirious frontend at <http://127.0.0.1:8005> connects to this backend at port 8010. The backend root returns service metadata; it no longer serves a separate frontend. Demo mode works without a key. Add only the provider keys you want to use to `.env`, then restart the server.

## Tests

```bash
source .venv/bin/activate
pytest -q
```

Agent tools, memory, planning, and approval controls will be added after the base chat loop is proven.
