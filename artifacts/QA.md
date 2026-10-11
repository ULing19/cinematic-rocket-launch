# Verification inventory

- Desktop initial view: full-height editor, detailed rocket and tower visible, materials readable, star field and haze visible; capture at 1440 x 1000 and 1440 x 900.
- 360-degree orbit: mouse drag changes visible hull and tower perspective; auto orbit toggles in both directions; pan and reset operate.
- Environment: twilight/night/sunrise, exposure, atmosphere and thrust sliders, bloom off/on; persisted settings survive reload.
- Hierarchy: rocket, pad, tower, stars and exhaust visibility off/on. Selection highlight and keyboard switches work.
- Camera presets: hero, wide, engine, aerial; sidebar camera shortcuts select the same presets.
- Animation: play/pause, scrub, restart, Space; inspect ignition, lift-off, ascent and completed sequence. Replay and reset recover a usable camera.
- Export: complete GLB and rocket-only GLB, embedded textures and named nodes; inspect in an independent GLTFLoader load. PNG and JSON downloads open and contain expected data.
- Other controls: assets and camera navigation, material details, help, fullscreen, dialog close and Escape.
- Small screen: initial scene and key controls fit a 390 x 844 viewport without horizontal overflow.
- Exploratory scenarios: turn thrust to zero, hide rocket while playing, scrub backwards after ascent, reload persisted settings, close export dialog during file generation.
- Observe browser errors, invalid geometry, missing external files and responsive clipping throughout.

## Completed verification — 2026-10-11

- 41 browser interaction checks passed; details in `interaction-checks.json`.
- Desktop: 1440×900 and 1440×1000. Mobile: 390×844, no horizontal overflow. The left desktop inspector intentionally scrolls at shorter window heights.
- Visually inspected the default scene, night, sunrise, engine detail, aerial, ascent, export dialog and mobile view. No canvas failures, missing textures or overlapping essential controls were observed.
- Checked manual orbit/pan/zoom, automatic orbit, all camera presets, object visibility, environment values, local persistence, dialogs, full screen, PNG/JSON/GLB export and animation playback/scrubbing/replay.
- Exploratory coverage included zero/full thrust, hidden rocket, backwards timeline seeking, repeated long drags, returning to origin and keyboard input. Fixed residual camera inertia found after repeated long drags; production reset was verified against the actual exported camera coordinates.
- Production build loaded with all external network requests blocked: zero external requests and zero browser errors. UI fonts are bundled locally.
- Complete GLB: 432 meshes, 457 nodes, 7 embedded images. Rocket GLB: 129 meshes, 142 nodes, 6 embedded images. Both include normal-mapped metal and heat-shield materials.
- Both final GLBs reloaded successfully through a separate GLTFLoader. Binary structure, embedded dependencies and buffer ranges passed `npm run verify:assets`.
- `npm run build`: TypeScript and production build passed. Vite emits a non-blocking bundle-size advisory for the Three.js engine.
- Chromium sessions were closed after verification; the editable development preview remains at http://127.0.0.1:5173.
