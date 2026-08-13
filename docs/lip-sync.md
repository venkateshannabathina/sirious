# Sirious Lip-Sync Architecture

Sirious uses the generated speech audio as the authoritative animation clock.
The agent backend returns one package containing MP3 audio and timestamped
viseme cues. The browser plays that audio and samples the cues against
`audio.currentTime` on every render frame.

```text
assistant reply
  -> Edge TTS audio + word boundaries
  -> lightweight word-to-viseme planner
  -> timestamped viseme package
  -> audio-clock player
  -> CC3/ARKit facial recipes
  -> Three.js facial-layer mixer
```

## Layer ownership

The manual ARKit panel has the highest priority. During normal speech, the
speech layer owns the jaw, lips and tongue. Living idle continues to own
blinks, gaze, breathing, brows and subtle head movement, but its random mouth
gestures are suspended. After audio ends, speech weights release smoothly and
idle mouth motion resumes after a short delay.

## Runtime diagnostics

The viewer publishes read-only state for testing:

- `document.body.dataset.lipSync` — audio time, active viseme and CC3 channels
- `document.body.dataset.speechSynthesis` — TTS request/playback state
- `document.body.dataset.expressionEngine` — idle and facial-layer state
- `document.body.dataset.arkitJawReadback` — final jaw value and rotation

## Privacy boundary

`POST /api/speech` sends its `text` value to the configured Edge TTS service.
Do not send secrets or private data for speech synthesis. The endpoint limits
text to 2,000 characters, applies the same local-origin restrictions as chat,
and does not persist generated audio.

## Upgrade path

The current planner derives visemes within speech-service word boundaries. It
is intentionally replaceable. A future forced phoneme aligner or provider that
returns native phonemes can replace the planner while preserving the frontend
contract and facial mixer.
