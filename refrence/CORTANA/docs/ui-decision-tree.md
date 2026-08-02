# CORTANA UI decision tree

## Design goal

The requested direction is a clean, sleek, fluid application interface with consistent monochrome chrome. This document organizes the existing features; it does not describe an already completed redesign.

The visual system should use white, black, and neutral gray for the application shell. Character materials, scene content, render previews, and user-selected object colors may remain colored because they are content rather than navigation chrome.

## Foundation status

Five additive stylesheets now exist:

1. `frontend/styles/tokens.css`
2. `frontend/styles/shell.css`
3. `frontend/styles/studio.css`
4. `frontend/styles/rig.css`
5. `frontend/styles/responsive.css`

They are linked by `frontend/index.html` after the legacy compatibility layer. The active order is tokens, shell, Studio, rig, then responsive.

The additive files preserve existing IDs and `data-*` behavior contracts. Their presence does not mean that JavaScript state ownership, navigation restructuring, or all legacy color declarations have already been resolved.

## Primary decision tree

```text
Open CORTANA
├─ Talk to the character
│  ├─ enter a message
│  ├─ hear the response
│  └─ observe emotion and lip sync
├─ Move or inspect the character
│  ├─ keyboard movement
│  ├─ orbit or zoom
│  └─ choose a camera view
├─ Adjust experience settings
│  ├─ voice/LLM provider
│  ├─ camera behavior
│  ├─ head tracking
│  └─ render shade
└─ Open Studio
   ├─ Create character media
   │  └─ Photo Booth
   │     ├─ choose animation
   │     ├─ adjust facial expression
   │     ├─ build a custom expression
   │     └─ capture photo or video
   └─ Edit the environment
      └─ World Editor
         ├─ create/select an object
         ├─ inspect the loaded scene
         ├─ edit transforms and properties
         ├─ adjust environment
         └─ save or reset
```

## Proposed shell organization

This is the target organization, not current markup:

```text
Application shell
├─ Top bar
│  ├─ product identity
│  ├─ active workspace
│  └─ global status
├─ Viewport
│  ├─ character/world canvas
│  └─ compact viewport tools
├─ Context panel
│  ├─ Settings, when requested
│  ├─ Photo Booth, in Studio media mode
│  └─ World Inspector, in Studio world mode
└─ Bottom action area
   ├─ chat, in companion mode
   ├─ capture actions, in Photo Booth
   └─ save/reset status, in World Editor
```

Only one high-attention contextual surface should be open at a time. Opening Studio should close the settings popover; changing Studio mode should change the contextual inspector and footer without creating another unrelated overlay.

## Target information architecture

The clean shell should eventually organize decisions into four understandable areas:

```text
CORTANA
├─ Play
│  ├─ Conversation
│  ├─ Movement
│  └─ Camera
├─ Studio
│  ├─ Capture
│  │  ├─ Animation
│  │  ├─ Quick Face
│  │  ├─ Face Rig
│  │  └─ Export
│  └─ World
│     ├─ Objects
│     ├─ Scene Inspector
│     └─ Environment
├─ Character
│  ├─ Current model
│  ├─ Rig capability
│  └─ Animation library
└─ Preferences
   ├─ AI and Voice
   ├─ Viewport
   ├─ Appearance
   └─ Advanced diagnostics
```

The Character area is a planned information boundary, not a current model-import feature. The current application still uses the supplied CC3 master. Diagnostics may move behind an Advanced surface but must remain reachable during the refactor.

## Workspace rules

### Companion mode

- The viewport and chat are primary.
- Camera and settings remain compact utilities.
- Movement controls must not trigger while typing into chat.
- Status should be quiet unless loading, speaking, saving, or failing.

### Photo Booth

- Keep the three task tabs: Animations, Facial Expression, and Expression Creator.
- Capture actions remain persistently reachable.
- Camera framing is contextual to capture and must not be duplicated in several visible locations.
- Advanced CC3 keys remain available through progressive disclosure.

### World Editor

- Separate creation, hierarchy, selection, and property editing.
- Destructive commands require clear disabled states and a selected target.
- Scene inspection must not rewrite the saved world merely by opening the editor.
- Save status must clearly distinguish saved, unsaved, saving, and failed.

## Monochrome system

The additive design tokens cover the initial:

- Canvas and surface whites.
- Primary and secondary black/gray text.
- Neutral borders and separators.
- Hover, pressed, selected, focus, disabled, and loading states.
- Consistent spacing, radius, shadow, typography, and motion.

They still require browser activation and visual QA before becoming the accepted system.

Recommended state vocabulary:

| State | Treatment |
| --- | --- |
| Default | White surface, dark text, neutral border |
| Hover | Slight gray surface change |
| Pressed | Stronger neutral fill and reduced elevation |
| Selected | Black fill with white text, or a clear black indicator |
| Focus | High-contrast outline that is not removed |
| Disabled | Reduced contrast plus disabled cursor/semantics |
| Error | Icon and explicit text; do not depend on red alone |
| Success | Icon and explicit text; do not depend on green alone |

For the expression rig:

- Morph: solid circular handle and solid rail.
- Bone: square or ring handle and double rail.
- Tongue: diamond handle and dashed rail.
- Always include a text label and selected-target description.

This preserves type meaning after removing the current yellow/blue/purple dependency.

## Layout and motion rules

- Use a shared spacing scale instead of one-off gaps.
- Use one panel width system and predictable responsive breakpoints.
- Keep primary action placement stable within a workspace.
- Animate opacity and transform only for short contextual transitions.
- Avoid motion that changes model state without an explicit action.
- Respect `prefers-reduced-motion`.
- Keep controls reachable at narrow viewport sizes without clipping the character canvas.

## Interaction consistency

- Buttons use the same hover, pressed, focus, and disabled behavior everywhere.
- Tabs use correct `role`, `aria-selected`, and keyboard navigation.
- Sliders display their value and support keyboard input.
- Icon-only actions keep an accessible name and tooltip.
- Reset actions identify their scope: selected control, face, pose, draft, or entire workspace.
- Unsaved world changes must be visible before closing or switching context.
- Every loading operation has completion and failure feedback.

## Migration sequence

1. Inventory every current control and its handler.
2. Add UI tokens without changing layout.
3. Replace inline colors and spacing with tokens.
4. Standardize primitive controls.
5. Reorganize the shell using the decision tree.
6. Convert feature panels one at a time.
7. Run behavior and visual QA after every panel migration.

Do not combine feature deletion, JavaScript modularization, and major visual re-layout into one change.
