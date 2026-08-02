# CORTANA QA checklist

## How to use this checklist

Run this checklist before and after every structural or UI migration. It is currently a manual release gate; the repository does not yet contain a complete automated suite.

Record the tested revision, browser, viewport, model hash, server command, and any intentionally skipped item.

## Repository safety

- [ ] No `.env` or credential value is staged for commit.
- [ ] No virtual environment, cache, `.DS_Store`, temporary MP3, or generated diagnostic is staged.
- [ ] Runtime source files changed only within the declared task scope.
- [ ] Required CC3 runtime assets are still present.
- [ ] Local raw assets are not part of the deployment artifact.
- [ ] The current feature map was reviewed before removing or renaming a control.

## Server and static routes

- [ ] The production-style server starts without reload.
- [ ] `GET /` returns the application.
- [ ] `/style.css`, `/app.js`, and required `/libs/*` files return successfully.
- [ ] `/model/cc3/cc3_master.glb` returns successfully.
- [ ] All ten `/model/cc3/animations/*.glb` files return successfully.
- [ ] The material-preview HDR returns successfully.
- [ ] Raw `model/test` assets are not exposed in the production configuration.
- [ ] Browser console has no uncaught error during startup.
- [ ] Loading UI reaches Ready and closes.

## Character and rendering

- [ ] CC3 character is visible, correctly scaled, and grounded.
- [ ] Skin, hair, eyes, teeth, tongue, and clothing render correctly.
- [ ] Shadows and the white tiled world render correctly.
- [ ] Natural shade is correct.
- [ ] Warm, cool, clay, graphite, X-ray, and material-preview modes work.
- [ ] Resize and high-DPI rendering do not crop or distort the viewport.
- [ ] No shader, texture, or WebGL warning is introduced.

## Animation and locomotion

- [ ] Baked idle plays continuously.
- [ ] Forward walk works.
- [ ] Forward run works with Shift.
- [ ] Left and right strafe walk work.
- [ ] Left and right strafe run work.
- [ ] Left and right turn work.
- [ ] Jump starts, lands, and returns to locomotion.
- [ ] Backward movement remains controlled.
- [ ] Character feet remain acceptably grounded.
- [ ] Collision prevents passing through configured objects.
- [ ] Movement input does not fire while typing in chat.
- [ ] Stopping movement returns smoothly to idle.

## Camera and tracking

- [ ] Portrait, face, and body presets frame correctly.
- [ ] Custom view can be saved, reloaded, and applied.
- [ ] Orbit mode works.
- [ ] WASD camera mode works.
- [ ] Lock mode blocks camera movement as intended.
- [ ] Angle, height, distance, and FOV sliders update the camera.
- [ ] Mouse-wheel zoom respects limits.
- [ ] Head-follow toggle and sensitivity work.
- [ ] Camera movement remains stable during walk, run, turn, and landing.

## Face and speech

- [ ] Automatic blinking continues during idle and speech.
- [ ] Emotion presets transition smoothly and return appropriately.
- [ ] Eye direction visibly moves both eyes left, right, up, and down.
- [ ] Look-at-camera mode works.
- [ ] Eye reset restores neutral eye bones and morphs.
- [ ] A, I, U, E, and O controls visibly form distinct mouth shapes.
- [ ] Speech-shape preview runs through the configured visemes.
- [ ] Timed lip-sync cues follow generated audio.
- [ ] Tongue cues do not leave the tongue displaced after speech.
- [ ] Manual face controls compose predictably with blink, gaze, emotion, and speech.

## Ultimate Expression Creator

- [ ] Creator opens without changing the neutral face.
- [ ] Runtime connectivity reports the expected supplied-asset baseline: 8 facial bones and 63 A/T shapes.
- [ ] Every visible rig handle can be selected and dragged by pointer.
- [ ] Keyboard adjustment works for focused controls.
- [ ] Screen-left and screen-right semantics drive the correct character side.
- [ ] Eye controls move the correct real eye bone.
- [ ] Jaw control moves `CC_Base_JawRoot`.
- [ ] Upper and lower teeth controls move the correct teeth bones.
- [ ] Tongue root, tip, out, and roll affect the intended chain/shape.
- [ ] Morph controls update all matching meshes rather than only one target.
- [ ] Symmetry mirrors only the intended paired controls.
- [ ] Strength scales the resulting model deformation.
- [ ] Inspector reports the selected control, target, kind, and value.
- [ ] Reset selected clears only the selected control.
- [ ] Reset all returns handles, morph weights, and real bone deltas to neutral.
- [ ] Closing and reopening the Creator does not preserve an unintended bone offset.

## Photo Booth

- [ ] Animation selector and preview work.
- [ ] Reset pose returns to the intended pose.
- [ ] Portrait, face, and body capture framing work.
- [ ] Overwrite-face toggle enables/disables the correct controls.
- [ ] All discovered CC3 face keys remain available.
- [ ] Still capture creates a valid image.
- [ ] Video start/stop creates a playable recording where supported.
- [ ] Capture status and errors are visible and understandable.

## World Editor

- [ ] Opening the editor pauses locomotion without corrupting animation state.
- [ ] Box, sphere, and cylinder creation work.
- [ ] Selection works through the list and viewport.
- [ ] Position, rotation, and scale updates affect the correct object.
- [ ] Color, visibility, and collision settings work.
- [ ] Duplicate and delete affect only the selected object.
- [ ] Undo and redo preserve a coherent history.
- [ ] Scene outliner search and visibility modes work.
- [ ] Skeleton visibility is restored correctly when leaving inspection.
- [ ] Background, ground, and tile density update the scene.
- [ ] Reset changes only the current draft until saved.
- [ ] Save persists through `PUT /api/world`.
- [ ] Reload restores the saved world through `GET /api/world`.
- [ ] Save failure leaves a recoverable draft and visible error.

## Chat, TTS, and audio

- [ ] Groq works when configured.
- [ ] OpenAI works when configured and installed.
- [ ] Missing provider credentials produce a clear degraded response.
- [ ] Chat input disables only while the request is active.
- [ ] Response text, emotion, and expression metadata are handled.
- [ ] Audio starts after the response.
- [ ] Web Audio fallback works when normal playback is blocked.
- [ ] Pause, abort, end, and error return the character to a valid state.
- [ ] Generated audio URL returns valid MP3 data.
- [ ] Old audio is eventually cleaned up.
- [ ] Keys entered in the UI are not logged or exposed in debug output.

## UI consistency

- [ ] If the additive UI foundation is enabled, styles load after legacy `style.css` in this order: tokens, shell, Studio, rig, responsive.
- [ ] Enabling or disabling the additive layer does not change JavaScript selectors or behavior contracts.
- [ ] Application chrome uses the approved white/black/neutral token system.
- [ ] Content colors are not accidentally desaturated.
- [ ] Typography, spacing, radii, borders, and shadows are consistent.
- [ ] Primary actions occupy a predictable location.
- [ ] Hover, pressed, selected, focus, disabled, loading, success, and error states are distinct.
- [ ] Rig types remain distinguishable without relying only on color.
- [ ] Tabs expose correct selection semantics.
- [ ] Icon-only controls have accessible names.
- [ ] All interactive controls are keyboard reachable.
- [ ] Focus indicators are visible.
- [ ] Sliders expose and update their value.
- [ ] Reduced-motion preference is respected.
- [ ] Narrow layouts remain usable without hidden critical actions.

## Debug regression evidence

In a development build:

- [ ] `document.body.dataset.cc3DebugReady` equals `1`.
- [ ] `window.__cc3Debug.getState()` returns without error.
- [ ] Debug state reports a visible model and valid bounding box.
- [ ] Expected action keys are registered.
- [ ] Locomotion speed, direction, grounded state, and input are coherent.
- [ ] Face channel, target, mesh, gaze, mouth, and rig data are coherent.
- [ ] Reset state shows no unintended facial bone delta.
- [ ] Final browser console contains no new error or warning attributable to the change.

## Release sign-off

- [ ] Behavior checklist passed.
- [ ] Visual comparison passed at desktop and narrow viewport sizes.
- [ ] API compatibility passed.
- [ ] Persistent storage behavior passed.
- [ ] Deployment artifact contains no secret or local-only asset.
- [ ] Documentation matches the behavior being released.
- [ ] Known limitations and intentionally deferred work are recorded.
