"""Audit source and target FBX skeletons for the Sirious standing-pose retarget."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import bpy


PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT_ROOT / "assets" / "animations" / "standing_pose_rig_audit.json"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def import_and_audit(path: Path) -> dict:
    clear_scene()
    bpy.ops.import_scene.fbx(
        filepath=str(path),
        automatic_bone_orientation=False,
        ignore_leaf_bones=False,
        use_anim=True,
        use_image_search=False,
    )
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    actions = []
    for action in bpy.data.actions:
        actions.append(
            {
                "name": action.name,
                "frame_range": [float(value) for value in action.frame_range],
                "fcurves": len(action.fcurves),
            }
        )
    return {
        "path": str(path.relative_to(PROJECT_ROOT)),
        "bytes": path.stat().st_size,
        "armatures": [
            {
                "name": armature.name,
                "bone_count": len(armature.data.bones),
                "bones": [bone.name for bone in armature.data.bones],
            }
            for armature in armatures
        ],
        "meshes": [mesh.name for mesh in meshes],
        "actions": actions,
    }


def main() -> None:
    source = PROJECT_ROOT / "assets" / "Female Standing Pose.fbx"
    target = PROJECT_ROOT / "assets" / "Blender" / "blender.Fbx"
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    audit = {
        "source": import_and_audit(source),
        "target": import_and_audit(target),
        "blender_version": bpy.app.version_string,
    }
    OUTPUT.write_text(json.dumps(audit, indent=2), encoding="utf-8")
    print(f"RIG_AUDIT={OUTPUT}")


if __name__ == "__main__":
    main()
