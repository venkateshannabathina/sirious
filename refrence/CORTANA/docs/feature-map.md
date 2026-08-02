# CORTANA feature map

## Purpose

This is the preservation inventory for reorganizing the application. It describes functionality present in the current source. It is not a claim that every feature has automated coverage or production hardening.

## Observed supplied-asset baseline

The following counts were observed from the current browser runtime and supplied CC3 asset. Record them again after each structural stage:

| Capability | Current observed baseline |
| --- | ---: |
| Registered animation actions | 10: idle plus 9 locomotion actions |
| Loaded scene nodes | 135 |
| Skinned meshes | 17 |
| Other meshes | 1 |
| Bones | 104 |
| Face meshes | 15 |
| Mesh-level morph targets | 1,381 |
| Synchronized logical face channels | 249 |
| Expression Creator controls | 42 |
| Weighted Creator facial bones | 8 |
| A/T facial shapes | 63 |

These values are regression evidence for this model, not hardcoded requirements for every future character.

## Main experience

```text
CORTANA
├─ 3D viewport
│  ├─ CC3 character loading
│  ├─ white tiled world
│  ├─ materials and shade presets
│  ├─ lighting, shadows, physics, and collision
│  └─ loading and runtime debug states
├─ Character motion
│  ├─ baked idle
│  ├─ forward walk and run
│  ├─ left/right strafe walk and run
│  ├─ left/right turn
│  ├─ jump
│  └─ WASD, arrows, Shift, and Space input
├─ Camera
│  ├─ portrait, face, body, and custom views
│  ├─ orbit, WASD, and lock modes
│  ├─ angle, height, distance, and FOV controls
│  ├─ saved custom view
│  ├─ wheel zoom
│  └─ movement follow, bob, roll, and landing response
├─ Companion face
│  ├─ emotion composition
│  ├─ automatic blink
│  ├─ head tracking
│  ├─ eye direction through CC3 eye bones and morphs
│  ├─ timed speech visemes
│  └─ tongue speech cues
└─ Chat
   ├─ Groq/OpenAI provider selection
   ├─ response emotion metadata
   ├─ Edge TTS speech generation
   ├─ generated audio playback
   └─ timed lip-sync playback
```

Talking-specific body clips are currently disabled because no compatible baked talking clips are configured. Speech still uses the idle/movement lifecycle, face expressions, audio, and lip sync.

## Global settings

- LLM provider selection.
- Frontend-supplied API key input.
- Camera lock.
- Head-follow toggle and sensitivity.
- Camera view and control mode selection.
- Camera angle, height, distance, and FOV.
- Save and apply custom camera view.
- Natural, warm, cool, clay, graphite, X-ray, and material-preview rendering.
- Studio launcher.

The future UI may reorganize these controls, but it must not silently remove them.

## Studio workspace

```text
Studio
├─ Photo Booth
│  ├─ Animations
│  │  ├─ animation selection
│  │  ├─ preview
│  │  ├─ pose reset
│  │  └─ portrait/face/body camera framing
│  ├─ Facial Expression
│  │  ├─ overwrite-face toggle
│  │  ├─ look-at-camera toggle
│  │  ├─ eye-direction pad
│  │  ├─ emotion controls
│  │  ├─ eye controls
│  │  ├─ A/I/U/E/O mouth controls
│  │  ├─ user-defined facial controls
│  │  ├─ all discovered CC3 face keys
│  │  ├─ expression previews
│  │  └─ speech-shape preview
│  ├─ Expression Creator
│  │  ├─ draggable facial control map
│  │  ├─ morph, bone, and tongue targets
│  │  ├─ left/right controls
│  │  ├─ symmetry
│  │  ├─ global strength
│  │  ├─ selected-target inspector
│  │  ├─ reset selected
│  │  └─ reset all
│  ├─ still-image capture
│  └─ video recording
└─ World Editor
   ├─ undo and redo
   ├─ duplicate and delete
   ├─ refresh scene and skeleton visibility
   ├─ box, sphere, and cylinder creation
   ├─ editable-object list
   ├─ loaded-scene hierarchy
   ├─ hierarchy search and visibility modes
   ├─ scene-node detail inspection
   ├─ object transform editing
   ├─ object color, visibility, and collision
   ├─ background, ground, and tile density
   ├─ local draft reset
   └─ save world
```

The current CC3 master is discovered at runtime rather than assuming every imported model is identical. Current diagnostics report 8 weighted facial bones and 63 A/T facial shapes for this character. Those counts are a compatibility baseline for the supplied asset, not a universal model requirement.

## Data and persistence

| State | Current storage |
| --- | --- |
| World document | `data/world.json` through `/api/world` |
| Custom camera view | Browser local storage |
| Generated TTS | `temp_audio/*.mp3` |
| Provider keys | Server environment and optionally the current frontend request |
| Expression/Studio edits | Runtime memory unless represented by saved world data |

## Debug and verification surfaces

- `window.__cc3Debug.getState()` returns character, animation, camera, physics, locomotion, face, rig, and sampled bone state.
- `document.body.dataset.cc3DebugState` mirrors serialized runtime state.
- `document.body.dataset.cc3DebugReady` indicates that debug hooks have been installed.

These are valuable regression surfaces and should remain available in development builds during modularization.

## Explicit preservation rules

- A layout change is not authorization to remove a feature.
- A feature may move to another panel only if the decision tree remains clear.
- Content-rendering colors are separate from application-chrome colors.
- Morph, bone, and tongue controls must remain distinguishable in monochrome without relying only on hue.
- Reset actions must restore the real model state, not just the visible UI handle.
- Left/right facial semantics must remain screen- and character-correct.
- World editing must preserve saved-world state separately from temporary scene inspection.

## Cross-feature ownership

Recent guardrails now:

- Reset the shared Studio scroll container when switching Studio mode or Photo Booth tab.
- Ignore camera-wheel zoom when the event begins inside an interactive control.
- Ignore global locomotion shortcuts from interactive UI and while Studio is open.
- Check complete Studio visibility, mode, and tab state before keeping Expression Creator bone overrides active.

The cleanup still needs clearer ownership boundaries for these shared behaviors:

- Quick face controls, advanced sliders, speech, and Expression Creator can write overlapping manual facial targets.
- Camera state is modified by root settings, movement mode, and Photo Booth without one authoritative store.
- Render-shade background and World Editor environment are competing appearance authorities.
- Armature inspection exists through both a scene mode and a separate toolbar control.

These are preservation-sensitive refactors: fix ownership with explicit state and tests rather than deleting one side of the conflict.
