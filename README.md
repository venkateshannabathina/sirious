# Sirious CC3 Peak Viewer

This first Sirious milestone is a full-screen, color-managed Three.js character
viewer. It uses the CC3 source under `assets/Blender/` and its lossless web
master under `assets/models/cc3_master.glb`.

The default body pose is baked offline from
`assets/Female Standing Pose.fbx` onto the native 101-bone CC3 armature. The
audited animation is stored at
`assets/animations/female_standing_baked.glb`; all 52 meaningful Mixamo source
bones are mapped, while CC3-only facial, twist, share, and helper bones remain
on their original hierarchy.

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
./run.sh
```

Open <http://127.0.0.1:8005>.

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
