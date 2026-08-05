from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_backend_is_api_only() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "service": "sirious-agent-backend",
        "frontend": False,
        "chat_endpoint": "/api/chat",
    }


def test_demo_chat() -> None:
    response = client.post(
        "/api/chat",
        json={
            "provider": "demo",
            "messages": [{"role": "user", "content": "hello lab"}],
        },
    )
    assert response.status_code == 200
    assert "hello lab" in response.json()["message"]
    assert "Phoebe" in response.json()["message"]


def test_missing_provider_key_is_clear(monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post(
        "/api/chat",
        json={
            "provider": "openai",
            "messages": [{"role": "user", "content": "hello"}],
        },
    )
    assert response.status_code == 400
    assert "OPENAI_API_KEY" in response.json()["detail"]


def test_groq_appears_in_config() -> None:
    response = client.get("/api/config")
    assert response.status_code == 200
    assert "groq" in response.json()["providers"]
    assert response.json()["models"]["groq"] == "llama-3.3-70b-versatile"


def test_provider_messages_include_phoebe_persona() -> None:
    from app import _with_phoebe_persona

    messages = _with_phoebe_persona([])
    assert messages[0].role == "system"
    assert "Phoebe" in messages[0].content
    assert "Venkatesh Annabathina" in messages[0].content
    assert "uncensored" in messages[0].content
    assert "hard boundaries" in messages[0].content
