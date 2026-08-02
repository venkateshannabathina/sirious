what i want now?

PROJECT SPECIFICATION: Emotion-Aware Conversational Voice Agent

Objective

Build a production-ready, real-time conversational voice system that converts user text into expressive speech with synchronized facial animation.

The system must use a Groq-hosted large language model for text generation and automatically control voice emotion, speaking style, prosody, and lip-sync without requiring manual tagging by the user.

The final experience should feel natural, emotionally adaptive, and fluid.

⸻

Core User Experience

Input:

* User enters plain text.

Output:

* AI-generated response.
* High-quality speech synthesis.
* Dynamic emotional expression.
* Accurate lip-sync data.
* Smooth transitions between emotions and speaking styles.
* Ready for avatar animation.

Example:

User: “I got selected for the internship!”

System behavior:

* Detect excitement.
* Generate an enthusiastic response.
* Produce energetic speech.
* Increase speaking rate slightly.
* Add appropriate vocal emphasis.
* Generate lip-sync timing automatically.

⸻

Technical Requirements

LLM Layer

Provider:

* Groq API

Requirements:

* Fast inference.
* Streaming support.
* Structured JSON output.
* Low latency.

Preferred models:

* Select the most capable reasoning model available through Groq at implementation time.

The implementation must allow model replacement without changing downstream components.

⸻

Prompt Orchestration Layer

Create a prompt wrapper that transforms plain user text into structured conversational metadata.

The LLM must never return free-form text only.

The LLM output schema must include:

{
  "response_text": "",
  "emotion": "",
  "emotion_intensity": 0.0,
  "speaking_rate": 1.0,
  "pitch_shift": 0.0,
  "volume": 1.0,
  "pause_markers": [],
  "facial_expressions": [],
  "lip_sync_style": "",
  "transition_duration_ms": 0,
  "voice_style": ""
}

⸻

Emotion System

Support at minimum:

* Neutral
* Happy
* Excited
* Calm
* Sad
* Empathetic
* Curious
* Confident
* Serious
* Surprised

Requirements:

* Detect emotional context automatically.
* Blend multiple emotions when necessary.
* Prevent abrupt emotional changes.
* Apply temporal smoothing between states.

Example:

Current emotion: Calm

Target emotion: Excited

System behavior:

* Interpolate gradually over time.
* Avoid sudden pitch or volume changes.

⸻

Text-to-Speech Layer

Requirements:

* Neural TTS.
* Streaming audio generation.
* Support SSML or equivalent expressive controls.
* Fine-grained control over:
    * Pitch
    * Speaking rate
    * Pauses
    * Emphasis
    * Volume
    * Style

Select the highest quality TTS provider available during implementation.

Prioritize:

1. Expressiveness
2. Latency
3. Voice naturalness
4. Cost efficiency

The implementation must support provider replacement.

⸻

Lip-Sync Layer

Requirements:

* Generate phoneme-level timing.
* Support viseme mapping.
* Enable real-time avatar animation.

Preferred output:

{
  "phonemes": [],
  "visemes": [],
  "timestamps": []
}

Support common avatar frameworks and standards.

Examples:

* ARKit blendshapes
* VRM avatars
* Ready Player Me
* Live2D
* Three.js avatars
* Unreal Engine MetaHuman
* Unity

⸻

Facial Expression Layer

Map emotions to facial controls.

Example:

{
  "happy": {
    "smile": 0.8,
    "eyebrow_raise": 0.3
  }
}

Requirements:

* Expression blending.
* Smooth interpolation.
* Configurable intensity.

⸻

System Architecture

Design the system as independent modules.

Required modules:

1. User Input Handler
2. Prompt Wrapper
3. Groq LLM Client
4. Emotion Analyzer
5. Response Generator
6. TTS Engine
7. Lip-Sync Generator
8. Expression Controller
9. Avatar Renderer
10. State Manager

Communication between modules must use structured APIs.

Avoid tightly coupled implementations.

⸻

State Management

Maintain conversational context including:

* Conversation history
* Previous emotional state
* Speaking style history
* User preferences

The system must remember recent emotional context to ensure natural continuity.

⸻

Performance Targets

Target latency:

* LLM response: under 500 ms
* First audio chunk: under 1 second
* Lip-sync generation: real time

End-to-end target:

* Under 2 seconds

⸻

Reliability Requirements

Implement:

* Structured output validation
* Retry mechanisms
* Provider failover
* Error recovery
* Logging
* Metrics collection

⸻

Security Requirements

* Secure API key storage
* No client-side secret exposure
* Input sanitization
* Rate limiting

⸻

Development Requirements

The implementation agent must:

* Select the optimal technology stack.
* Justify architectural decisions.
* Identify dependencies.
* Create an implementation roadmap.
* Generate all required code.
* Create configuration files.
* Create environment templates.
* Produce documentation.
* Generate tests.
* Validate all integrations.

Do not ask for clarification unless absolutely necessary.

Make reasonable assumptions and continue implementation autonomously.

⸻

Deliverables

Generate:

* Complete project structure
* Source code
* Configuration files
* API specifications
* Documentation
* Setup instructions
* Deployment instructions
* Testing procedures

⸻

Success Criteria

The project is successful if:

* Users provide only text input.
* The system generates expressive speech automatically.
* Emotional transitions feel natural.
* Lip-sync is accurate.
* Avatar expressions match speech.
* Components are modular.
* Providers can be replaced without major changes.
* End-to-end latency remains low.

Build the highest quality implementation possible while maintaining simplicity, scalability, and maintainability.
