# Phoebe Chat Lab

A deliberately small chatbot test bench with an old-school interface. The character is Phoebe, a virtual companion created by Venkatesh Annabathina. The first version supports:

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

Open <http://127.0.0.1:8010>. Demo mode works immediately. Add only the keys you want to use to `.env`, then restart the server.

## Tests

```bash
source .venv/bin/activate
pytest -q
```

Agent tools, memory, planning, and approval controls will be added after the base chat loop is proven.
