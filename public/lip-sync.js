(() => {
  'use strict';

  const REQUEST_TIMEOUT_MS = 50_000;
  const MAX_SPEECH_LENGTH = 2_000;
  const state = {
    apiBase: '',
    generation: 0,
    controller: null,
    objectUrl: null,
  };

  function publish(mode, detail = {}) {
    document.body.dataset.speechSynthesis = JSON.stringify({ mode, ...detail });
    window.dispatchEvent(new CustomEvent('sirious:speech-state', {
      detail: { mode, ...detail },
    }));
  }

  function base64AudioUrl(encoded, mimeType) {
    const binary = window.atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  }

  function configure(apiBase) {
    state.apiBase = String(apiBase || '').replace(/\/$/, '');
  }

  function stop(reason = 'stopped') {
    state.generation += 1;
    if (state.controller) state.controller.abort();
    state.controller = null;
    window.SiriousFaceSpeech?.stop();
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = null;
    publish('idle', { reason });
  }

  async function speak(content) {
    const text = String(content || '').trim().slice(0, MAX_SPEECH_LENGTH);
    if (!text || !state.apiBase) return;
    stop('replaced');
    const generation = state.generation + 1;
    state.generation = generation;
    const controller = new AbortController();
    state.controller = controller;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    publish('preparing');

    try {
      const response = await fetch(`${state.apiBase}/api/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ text }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(
        response.status < 500 && typeof payload.detail === 'string'
          ? payload.detail
          : 'Speech generation failed.',
      );
      if (generation !== state.generation) return;
      if (typeof payload.audio_base64 !== 'string' || !Array.isArray(payload.visemes)) {
        throw new Error('The speech service returned an invalid animation package.');
      }
      if (!window.SiriousFaceSpeech?.play) {
        throw new Error('The facial speech engine is not ready.');
      }

      state.objectUrl = base64AudioUrl(payload.audio_base64, payload.mime_type || 'audio/mpeg');
      publish('speaking', { voice: payload.voice, cues: payload.visemes.length });
      await window.SiriousFaceSpeech.play({
        audioUrl: state.objectUrl,
        cues: payload.visemes,
      });
      if (generation === state.generation) publish('idle', { reason: 'ended' });
    } catch (error) {
      if (generation !== state.generation) return;
      const aborted = error instanceof DOMException && error.name === 'AbortError';
      publish('error', {
        message: aborted ? 'Speech generation timed out.' : error instanceof Error
          ? error.message
          : 'Speech playback failed.',
      });
      throw error;
    } finally {
      window.clearTimeout(timeout);
      if (generation === state.generation) {
        state.controller = null;
        if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
        state.objectUrl = null;
      }
    }
  }

  window.addEventListener('pagehide', () => stop('pagehide'), { once: true });
  window.SiriousLipSync = Object.freeze({ configure, speak, stop });
})();
