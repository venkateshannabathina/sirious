from fastapi.testclient import TestClient

from app import app


client = TestClient(app)


def test_health_reports_model_ready():
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["model_ready"] is True
    assert payload["model_bytes"] > 70_000_000


def test_viewer_and_model_are_served():
    assert client.get("/").status_code == 200
    response = client.get("/assets/models/cc3_master.glb", headers={"Range": "bytes=0-31"})
    assert response.status_code in {200, 206}
    assert response.content[:4] == b"glTF"

    pose = client.get("/assets/animations/female_standing_baked.glb")
    assert pose.status_code == 200
    assert pose.content[:4] == b"glTF"


def test_living_idle_expression_engine_is_exposed():
    home_response = client.get("/")
    assert "no-store" in home_response.headers["cache-control"]
    html = home_response.text
    assert 'id="expression-idle-toggle"' in html
    assert 'id="expression-idle-status"' in html
    assert "sirious-chat-v13" in html
    assert 'id="chat-form"' in html
    assert 'id="chat-input"' in html
    assert 'id="chat-send"' in html

    script = client.get("/app.js").text
    assert "function updateLivingIdle" in script
    assert "function applyLivingBody" in script
    assert "CC_Base_Spine01" in script
    assert "CC_Base_Spine02" in script
    assert "CC_Base_L_Eye" in script
    assert "CC_Base_R_Eye" in script
    assert "function applyEyeRig" in script
    assert "Left eye vertical trim" in script
    assert "Right eye vertical trim" in script
    assert "leftPitch: Number(leftPitch.toFixed(2))" in script
    assert "rightPitch: Number(rightPitch.toFixed(2))" in script
    assert "eye.quaternion.copy(parentWorld.invert()).multiply(worldDelta).multiply(baseWorld)" in script
    assert "function setCoordinatedSideGaze" in script
    assert "Look left" in script
    assert "Look right" in script
    assert "A06_Eye_Look_Up_Left" in script
    assert "A13_Eye_Look_Out_Right" in script
    assert "arkitLeftPitch" in script
    assert "IDLE_BROW_RECIPES" in script
    assert "function scheduleIdleBrow" in script
    assert "function sampleIdleBrow" in script
    assert "nextBrowAt" in script
    assert "const arkitGazeScale = 145 / 22" in script
    assert "desired.A10_Eye_Look_Out_Left = right" in script
    assert "desired.A12_Eye_Look_In_Right = right" in script
    assert "IDLE_MOUTH_RECIPES" in script
    assert "IDLE_LIP_READJUSTMENT" in script
    assert "function scheduleIdleMouth" in script
    assert "function sampleIdleMouth" in script
    assert "nextLipReadjustAt" in script
    assert "function getComposedARKitValue" in script
    assert "state.arkit.panelOpen || !state.expression.enabled" in script
    assert "document.body.dataset.expressionEngine" in script
    assert "http://127.0.0.1:8010" in script
    assert "function initializeChat" in script
    assert "function sendChatMessage" in script
