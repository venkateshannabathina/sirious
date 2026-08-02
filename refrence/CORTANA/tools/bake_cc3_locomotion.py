"""Bake every locomotion clip directly onto the CC3 armature."""

import json
import math
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))

from bake_cc3_idle import (
    BONE_MAP,
    CC3_FBX,
    PROJECT_ROOT,
    bake_world_space_retarget,
    clear_scene,
    find_armature,
    import_fbx,
    render_diagnostic,
)


SOURCE_DIR = PROJECT_ROOT / "model/test/Female Locomotion Pack"
OUTPUT_DIR = PROJECT_ROOT / "model/cc3/animations"
DIAGNOSTIC_DIR = PROJECT_ROOT / "model/cc3/diagnostics/locomotion"
AUDIT_PATH = DIAGNOSTIC_DIR / "locomotion_retarget_audit.json"

CLIPS = (
    ("loco_walk", "walking.fbx", "walk_baked.glb", "CC3_Loco_Walk_Baked"),
    ("loco_run", "running.fbx", "run_baked.glb", "CC3_Loco_Run_Baked"),
    ("loco_jump", "jump.fbx", "jump_baked.glb", "CC3_Loco_Jump_Baked"),
    (
        "loco_left_walk",
        "left strafe walk.fbx",
        "left_walk_baked.glb",
        "CC3_Loco_Left_Walk_Baked",
    ),
    (
        "loco_right_walk",
        "right strafe walk.fbx",
        "right_walk_baked.glb",
        "CC3_Loco_Right_Walk_Baked",
    ),
    (
        "loco_left_run",
        "left strafe.fbx",
        "left_run_baked.glb",
        "CC3_Loco_Left_Run_Baked",
    ),
    (
        "loco_right_run",
        "right strafe.fbx",
        "right_run_baked.glb",
        "CC3_Loco_Right_Run_Baked",
    ),
    (
        "loco_left_turn",
        "left turn.fbx",
        "left_turn_baked.glb",
        "CC3_Loco_Left_Turn_Baked",
    ),
    (
        "loco_right_turn",
        "right turn.fbx",
        "right_turn_baked.glb",
        "CC3_Loco_Right_Turn_Baked",
    ),
)


def build_pose_audit(scene, source, target, source_path, mapped_bone_count):
    sample_frames = sorted(
        {
            scene.frame_start,
            (scene.frame_start + scene.frame_end) // 2,
            scene.frame_end,
        }
    )
    maximum_error = 0.0
    frame_errors = {}
    for frame in sample_frames:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        bone_errors = {}
        for source_name, target_name in BONE_MAP.items():
            if source_name not in source.pose.bones or target_name not in target.pose.bones:
                continue
            source_direction = (
                source.matrix_world.to_3x3() @ source.pose.bones[source_name].vector
            ).normalized()
            target_direction = (
                target.matrix_world.to_3x3() @ target.pose.bones[target_name].vector
            ).normalized()
            angle = math.degrees(source_direction.angle(target_direction))
            maximum_error = max(maximum_error, angle)
            bone_errors[source_name] = round(angle, 6)
        frame_errors[str(frame)] = bone_errors

    return {
        "source": str(source_path.relative_to(PROJECT_ROOT)),
        "frames": [scene.frame_start, scene.frame_end],
        "sample_frames": sample_frames,
        "mapped_bones": mapped_bone_count,
        "maximum_direction_error_degrees": round(maximum_error, 6),
        "frame_errors_degrees": frame_errors,
    }


def remove_source(objects, source_action):
    for obj in objects:
        bpy.data.objects.remove(obj, do_unlink=True)
    if source_action and source_action.name in bpy.data.actions:
        bpy.data.actions.remove(source_action)


def export_animation(target, baked_action, output_path):
    for action in list(bpy.data.actions):
        if action != baked_action:
            bpy.data.actions.remove(action)

    bpy.ops.object.select_all(action="DESELECT")
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.export_scene.gltf(
        filepath=str(output_path),
        export_format="GLB",
        use_selection=True,
        export_materials="NONE",
        export_cameras=False,
        export_lights=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_frame_range=True,
        export_force_sampling=True,
        export_skins=True,
        export_def_bones=True,
        export_morph=False,
        export_yup=True,
    )


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DIAGNOSTIC_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()

    target_objects = import_fbx(CC3_FBX)
    target = find_armature(target_objects, "CC3_Base_Plus")
    target_visuals = [target] + [
        obj
        for obj in target_objects
        if obj.type == "MESH" and obj.find_armature() == target
    ]
    audits = {}

    for key, source_name, output_name, action_name in CLIPS:
        source_path = SOURCE_DIR / source_name
        output_path = OUTPUT_DIR / output_name
        source_objects = import_fbx(source_path)
        source = find_armature(source_objects)
        if not source.animation_data or not source.animation_data.action:
            raise RuntimeError(f"{source_path} contains no animation")
        source_action = source.animation_data.action

        scene = bpy.context.scene
        scene.frame_start = int(source_action.frame_range[0])
        scene.frame_end = int(source_action.frame_range[1])
        baked_action, mapped_bone_count = bake_world_space_retarget(
            scene,
            source,
            target,
            action_name=action_name,
            strip_forward_root_motion=True,
        )
        audits[key] = build_pose_audit(
            scene,
            source,
            target,
            source_path,
            mapped_bone_count,
        )

        midpoint = (scene.frame_start + scene.frame_end) // 2
        if key in {"loco_walk", "loco_run"}:
            render_diagnostic(
                DIAGNOSTIC_DIR / f"{key}_mid_front.png",
                target_visuals,
                midpoint,
                view_sign=-1,
            )
            render_diagnostic(
                DIAGNOSTIC_DIR / f"{key}_mid_back.png",
                target_visuals,
                midpoint,
                view_sign=1,
            )
            render_diagnostic(
                DIAGNOSTIC_DIR / f"{key}_mid_side.png",
                target_visuals,
                midpoint,
                view_axis="X",
                view_sign=-1,
            )

        remove_source(source_objects, source_action)
        export_animation(target, baked_action, output_path)
        print(
            f"BAKED={key} output={output_path.name} "
            f"frames={scene.frame_start}-{scene.frame_end} "
            f"max_error={audits[key]['maximum_direction_error_degrees']}"
        )

    AUDIT_PATH.write_text(json.dumps(audits, indent=2), encoding="utf-8")
    print(f"LOCOMOTION_AUDIT={AUDIT_PATH}")


if __name__ == "__main__":
    main()
