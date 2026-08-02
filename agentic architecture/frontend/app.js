const form = document.querySelector("#chat-form");
const promptInput = document.querySelector("#prompt");
const messagesView = document.querySelector("#messages");
const providerSelect = document.querySelector("#provider");
const modelInput = document.querySelector("#model");
const sendButton = document.querySelector("#send");
const clearButton = document.querySelector("#clear");
const statusView = document.querySelector("#status");

const API_BASE = window.location.protocol === "file:" ? "http://127.0.0.1:8010" : "";

let models = {};
let availability = {};
let messages = [];

function addMessage(role, content, error = false) {
  const block = document.createElement("div");
  block.className = `message ${role}${error ? " error" : ""}`;
  const label = document.createElement("strong");
  label.textContent = error ? "Error" : role === "user" ? "You" : "Assistant";
  const text = document.createElement("span");
  text.textContent = content;
  block.append(label, text);
  messagesView.append(block);
  messagesView.scrollTop = messagesView.scrollHeight;
}

function updateProvider() {
  const provider = providerSelect.value;
  modelInput.value = models[provider] || "";
  statusView.textContent = provider === "demo"
    ? "Demo mode is ready. No tokens or external API calls will be used."
    : availability[provider]
      ? `${provider} key detected on the server.`
      : `${provider} key is not configured. Add it to .env and restart.`;
}

async function loadConfig() {
  try {
    const response = await fetch(`${API_BASE}/api/config`);
    if (!response.ok) throw new Error("Could not read server configuration.");
    const config = await response.json();
    models = config.models;
    availability = config.providers;
    updateProvider();
  } catch (error) {
    statusView.textContent = error.message;
  }
}

providerSelect.addEventListener("change", updateProvider);
clearButton.addEventListener("click", () => {
  messages = [];
  messagesView.replaceChildren();
  promptInput.focus();
});

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = promptInput.value.trim();
  if (!content || sendButton.disabled) return;

  messages.push({ role: "user", content });
  addMessage("user", content);
  promptInput.value = "";
  sendButton.disabled = true;
  sendButton.textContent = "Waiting...";

  try {
    const response = await fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: providerSelect.value,
        model: modelInput.value.trim() || null,
        messages,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || "The request failed.");
    messages.push({ role: "assistant", content: result.message });
    addMessage("assistant", result.message);
  } catch (error) {
    addMessage("assistant", error.message, true);
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Send Message";
    promptInput.focus();
  }
});

loadConfig();
