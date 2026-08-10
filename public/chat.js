(() => {
  'use strict';

  const MAX_MESSAGES = 24;
  const MAX_CONTENT_LENGTH = 8000;
  const REQUEST_TIMEOUT_MS = 50_000;
  const PROVIDER_PRIORITY = Object.freeze([
    'groq',
    'openai',
    'anthropic',
    'gemini',
    'grok',
    'demo',
  ]);
  const LOCAL_COMMANDS = Object.freeze({
    '/settings': 'sirious:open-settings',
    '/reset': 'sirious:reset-view',
  });

  function appendMessage(container, role, content, error = false) {
    const message = document.createElement('div');
    message.className = `chat-message ${role}${error ? ' error' : ''}`;
    message.textContent = content;
    container.appendChild(message);
    container.scrollTop = container.scrollHeight;
  }

  async function readApiResponse(response) {
    const raw = await response.text();
    let payload = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch (_) {
      throw new Error('The agent returned an invalid response.');
    }

    if (!response.ok) {
      const safeDetail = response.status < 500 && typeof payload.detail === 'string'
        ? payload.detail
        : 'The agent request failed. Check the local backend log.';
      throw new Error(safeDetail);
    }
    return payload;
  }

  function mount(panel) {
    if (!panel || panel.dataset.chatMounted === 'true') return;

    const localAgentBase = ['127.0.0.1', 'localhost'].includes(window.location.hostname)
      ? 'http://127.0.0.1:8010'
      : '';
    const apiBase = panel.dataset.apiBase || localAgentBase;
    const form = panel.querySelector('#chat-form');
    const input = panel.querySelector('#chat-input');
    const send = panel.querySelector('#chat-send');
    const messages = panel.querySelector('#chat-messages');
    const status = panel.querySelector('#chat-status');
    if (!form || !input || !send || !messages || !status) {
      throw new Error('The Sirious chat interface is incomplete.');
    }

    panel.dataset.chatMounted = 'true';
    window.SiriousLipSync?.configure(apiBase);
    const state = {
      ready: false,
      sending: false,
      provider: 'demo',
      model: null,
      messages: [],
      voiceActive: false,
    };

    function publishState(extra = {}) {
      document.body.dataset.chatBackend = JSON.stringify({
        ready: state.ready,
        provider: state.provider,
        model: state.model,
        endpoint: `${apiBase}/api/chat`,
        ...extra,
      });
    }

    async function initialize() {
      send.disabled = true;
      if (!apiBase) {
        status.textContent = 'Agent backend not configured';
        publishState({ error: 'Set data-api-base to enable chat.' });
        return;
      }
      status.textContent = 'Connecting…';
      try {
        const response = await fetch(`${apiBase}/api/config`, { cache: 'no-store' });
        const config = await readApiResponse(response);
        const provider = PROVIDER_PRIORITY.find((name) => config.providers?.[name] === true);
        if (!provider) throw new Error('No chat provider is available.');

        state.provider = provider;
        state.model = config.models?.[provider] || null;
        state.ready = true;
        send.disabled = false;
        status.textContent = `${provider === 'demo' ? 'Demo' : provider.toUpperCase()} ready`;
        publishState();
      } catch (error) {
        state.ready = false;
        status.textContent = 'Agent backend offline';
        publishState({ error: error instanceof Error ? error.message : 'Connection failed' });
      }
    }

    function readyLabel() {
      return `${state.provider === 'demo' ? 'Demo' : state.provider.toUpperCase()} ready`;
    }

    window.addEventListener('sirious:speech-state', (event) => {
      const mode = event.detail?.mode;
      state.voiceActive = mode === 'preparing' || mode === 'speaking';
      if (mode === 'preparing') status.textContent = 'Preparing voice…';
      else if (mode === 'speaking') status.textContent = 'Speaking…';
      else if (mode === 'error') status.textContent = 'Voice unavailable';
      else if (!state.sending) status.textContent = readyLabel();
      publishState({ speech: mode || 'idle' });
    });

    async function submit(content) {
      if (!state.ready || state.sending) return;
      const text = String(content || '').trim().slice(0, MAX_CONTENT_LENGTH);
      if (!text) return;
      const localCommand = LOCAL_COMMANDS[text.toLowerCase()];
      if (localCommand) {
        input.value = '';
        window.dispatchEvent(new CustomEvent(localCommand));
        status.textContent = readyLabel();
        publishState({ command: text.toLowerCase() });
        return;
      }

      state.messages = state.messages.slice(-(MAX_MESSAGES - 1));
      state.messages.push({ role: 'user', content: text });
      appendMessage(messages, 'user', text);
      input.value = '';
      state.sending = true;
      send.disabled = true;
      send.textContent = '…';
      status.textContent = 'Thinking…';

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${apiBase}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            provider: state.provider,
            model: state.model,
            messages: state.messages,
          }),
        });
        const result = await readApiResponse(response);
        if (typeof result.message !== 'string' || !result.message.trim()) {
          throw new Error('The agent returned an empty response.');
        }
        state.messages.push({ role: 'assistant', content: result.message });
        state.messages = state.messages.slice(-MAX_MESSAGES);
        appendMessage(messages, 'assistant', result.message);
        if (window.SiriousLipSync?.speak) {
          window.SiriousLipSync.speak(result.message).catch(() => { /* surfaced by speech state */ });
        } else {
          status.textContent = readyLabel();
        }
      } catch (error) {
        const message = error instanceof DOMException && error.name === 'AbortError'
          ? 'The agent took too long to reply.'
          : error instanceof Error ? error.message : 'The agent request failed.';
        appendMessage(messages, 'assistant', message, true);
        status.textContent = 'Reply failed';
      } finally {
        window.clearTimeout(timeout);
        state.sending = false;
        send.disabled = !state.ready;
        send.textContent = 'Send';
        if (!state.voiceActive && status.textContent === 'Thinking…') status.textContent = readyLabel();
        input.focus();
      }
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submit(input.value);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.shiftKey) return;
      event.preventDefault();
      submit(input.value);
    });

    initialize();
  }

  window.SiriousChat = Object.freeze({ mount });
})();
