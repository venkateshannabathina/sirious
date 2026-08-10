# Sirious CC3 Peak Viewer

This first Sirious milestone is a full-screen, color-managed Three.js character
viewer. It uses the CC3 source under `assets/Blender/` and its lossless web
master under `public/assets/models/cc3_master.glb`.

The default body pose is baked offline from
`assets/Female Standing Pose.fbx` onto the native 101-bone CC3 armature. The
audited animation is stored at
`public/assets/animations/female_standing_baked.glb`; all 52 meaningful Mixamo source
bones are mapped, while CC3-only facial, twist, share, and helper bones remain
on their original hierarchy.

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -e '.[dev]'
./run.sh
```

Open <http://127.0.0.1:8005>.

## Deploy to Vercel

The repository is configured for Vercel's zero-config FastAPI runtime. Browser
files live under `public/`, so large GLB and HDR resources are served by
Vercel's CDN instead of passing through the Function response-size limit.

```bash
vercel deploy
```

No build command or output directory is required. The deployed viewer works
without secrets. Chat remains disabled in production unless the
`data-api-base` attribute in `public/index.html` points at a separately deployed
agent backend; local development continues to use `http://127.0.0.1:8010`.

To enable chat and audio-driven lip sync, start the agent backend in a second
terminal:

```bash
cd "agentic architecture"
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8010
```

Assistant replies are synthesized through Edge TTS. The returned audio is the
master clock for timestamped CC3/ARKit mouth animation. See
[`docs/lip-sync.md`](docs/lip-sync.md) for the layer ownership, diagnostics,
privacy boundary, and upgrade path.

## Rendering profile

- Peak profile is the default: high-performance WebGL context, MSAA,
  device-aware pixel ratio up to 2.5×, ACES filmic tone mapping, sRGB output,
  image-based HDR lighting, maximum texture anisotropy, and 2048px soft shadows.
- Balanced profile lowers pixel ratio and shadow resolution for future world
  simulation load without changing the model asset.
- The renderer clamps pixel ratio to the GPU's maximum renderbuffer size, so
  ultra-high-DPI displays do not create invalid framebuffers.
- GLB/glTF/FBX files can be previewed from the settings panel. GLB is preferred
  because it packages geometry, rig, morphs, and textures into one web-native
  file.

The renderer can show all detail present in the export, but it cannot recreate
detail that is missing from the source geometry or textures.
