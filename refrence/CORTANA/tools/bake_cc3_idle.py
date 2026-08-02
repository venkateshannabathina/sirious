"""Bake the Mixamo idle onto the original CC3 armature."""

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


PROJECT_ROOT = Path(__file__).resolve().parents[1]
CC3_FBX = PROJECT_ROOT / "model/test/Blender/blender.Fbx"
SOURCE_FBX = PROJECT_ROOT / "model/test/Idle.fbx"
SOURCE_REFERENCE_FBX = (
    Path.home()
    / "Desktop/BLENDER/animations/Female Locomotion Pack/OBJ.fbx"
)
OUTPUT_DIR = PROJECT_ROOT / "model/cc3/animations"
OUTPUT_GLB = OUTPUT_DIR / "idle_baked.glb"
DIAGNOSTIC_DIR = PROJECT_ROOT / "model/cc3/diagnostics"
DIAGNOSTIC_AUDIT = DIAGNOSTIC_DIR / "idle_retarget_audit.json"

TARGET_REST_DELTA_BONES = frozenset(
    {
        "CC_Base_Hip",
        "CC_Base_Pelvis",
        "CC_Base_Waist",
        "CC_Base_Spine02",
        "CC_Base_NeckTwist01",
        "CC_Base_Head",
        "CC_Base_L_Foot",
        "CC_Base_L_ToeBase",
        "CC_Base_R_Foot",
        "CC_Base_R_ToeBase",
    }
)
TORSO_FORWARD_CORRECTION_DEGREES = 3.0
TORSO_FORWARD_CORRECTION_BONES = frozenset(
    {
        "CC_Base_Waist",
        "CC_Base_Spine02",
        "CC_Base_NeckTwist01",
        "CC_Base_Head",
    }
)


BONE_MAP = {
    "mixamorig:Hips": "CC_Base_Hip",
    "mixamorig:Spine": "CC_Base_Pelvis",
    "mixamorig:Spine1": "CC_Base_Waist",
    "mixamorig:Spine2": "CC_Base_Spine02",
    "mixamorig:Neck": "CC_Base_NeckTwist01",
    "mixamorig:Head": "CC_Base_Head",
    "mixamorig:LeftShoulder": "CC_Base_L_Clavicle",
    "mixamorig:LeftArm": "CC_Base_L_Upperarm",
    "mixamorig:LeftForeArm": "CC_Base_L_Forearm",
    "mixamorig:LeftHand": "CC_Base_L_Hand",
    "mixamorig:LeftHandThumb1": "CC_Base_L_Thumb1",
    "mixamorig:LeftHandThumb2": "CC_Base_L_Thumb2",
    "mixamorig:LeftHandThumb3": "CC_Base_L_Thumb3",
    "mixamorig:LeftHandIndex1": "CC_Base_L_Index1",
    "mixamorig:LeftHandIndex2": "CC_Base_L_Index2",
    "mixamorig:LeftHandIndex3": "CC_Base_L_Index3",
    "mixamorig:LeftHandMiddle1": "CC_Base_L_Mid1",
    "mixamorig:LeftHandMiddle2": "CC_Base_L_Mid2",
    "mixamorig:LeftHandMiddle3": "CC_Base_L_Mid3",
    "mixamorig:LeftHandRing1": "CC_Base_L_Ring1",
    "mixamorig:LeftHandRing2": "CC_Base_L_Ring2",
    "mixamorig:LeftHandRing3": "CC_Base_L_Ring3",
    "mixamorig:LeftHandPinky1": "CC_Base_L_Pinky1",
    "mixamorig:LeftHandPinky2": "CC_Base_L_Pinky2",
    "mixamorig:LeftHandPinky3": "CC_Base_L_Pinky3",
    "mixamorig:RightShoulder": "CC_Base_R_Clavicle",
    "mixamorig:RightArm": "CC_Base_R_Upperarm",
    "mixamorig:RightForeArm": "CC_Base_R_Forearm",
    "mixamorig:RightHand": "CC_Base_R_Hand",
    "mixamorig:RightHandThumb1": "CC_Base_R_Thumb1",
    "mixamorig:RightHandThumb2": "CC_Base_R_Thumb2",
    "mixamorig:RightHandThumb3": "CC_Base_R_Thumb3",
    "mixamorig:RightHandIndex1": "CC_Base_R_Index1",
    "mixamorig:RightHandIndex2": "CC_Base_R_Index2",
    "mixamorig:RightHandIndex3": "CC_Base_R_Index3",
    "mixamorig:RightHandMiddle1": "CC_Base_R_Mid1",
    "mixamorig:RightHandMiddle2": "CC_Base_R_Mid2",
    "mixamorig:RightHandMiddle3": "CC_Base_R_Mid3",
    "mixamorig:RightHandRing1": "CC_Base_R_Ring1",
    "mixamorig:RightHandRing2": "CC_Base_R_Ring2",
    "mixamorig:RightHandRing3": "CC_Base_R_Ring3",
    "mixamorig:RightHandPinky1": "CC_Base_R_Pinky1",
    "mixamorig:RightHandPinky2": "CC_Base_R_Pinky2",
    "mixamorig:RightHandPinky3": "CC_Base_R_Pinky3",
    "mixamorig:LeftUpLeg": "CC_Base_L_Thigh",
    "mixamorig:LeftLeg": "CC_Base_L_Calf",
    "mixamorig:LeftFoot": "CC_Base_L_Foot",
    "mixamorig:LeftToeBase": "CC_Base_L_ToeBase",
    "mixamorig:RightUpLeg": "CC_Base_R_Thigh",
    "mixamorig:RightLeg": "CC_Base_R_Calf",
    "mixamorig:RightFoot": "CC_Base_R_Foot",
    "mixamorig:RightToeBase": "CC_Base_R_ToeBase",
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)


def import_fbx(path):
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.fbx(
        filepath=str(path),
        automatic_bone_orientation=False,
        ignore_leaf_bones=False,
        use_anim=True,
        use_image_search=True,
    )
    return [obj for obj in bpy.context.scene.objects if obj not in before]


def find_armature(objects, expected=None):
    armatures = [obj for obj in objects if obj.type == "ARMATURE"]
    if expected:
        for obj in armatures:
            if obj.name == expected:
                return obj
    if not armatures:
        raise RuntimeError("Imported FBX contains no armature")
    return max(armatures, key=lambda obj: len(obj.data.bones))


def get_world_bounds(objects):
    minimum = Vector((float("inf"),) * 3)
    maximum = Vector((float("-inf"),) * 3)
    found = False
    for obj in objects:
        if obj.type != "MESH":
            continue
        found = True
        for corner in obj.bound_box:
            world_corner = obj.matrix_world @ Vector(corner)
            minimum.x = min(minimum.x, world_corner.x)
            minimum.y = min(minimum.y, world_corner.y)
            minimum.z = min(minimum.z, world_corner.z)
            maximum.x = max(maximum.x, world_corner.x)
            maximum.y = max(maximum.y, world_corner.y)
            maximum.z = max(maximum.z, world_corner.z)
    if not found:
        raise RuntimeError("No renderable mesh bounds found")
    return minimum, maximum


def render_diagnostic(path, visible_objects, frame, view_axis="Y", view_sign=-1):
    visible = set(visible_objects)
    for obj in bpy.context.scene.objects:
        obj.hide_render = obj not in visible

    scene = bpy.context.scene
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    minimum, maximum = get_world_bounds(visible_objects)
    center = (minimum + maximum) * 0.5
    size = maximum - minimum

    camera_data = bpy.data.cameras.new(f"DiagnosticCamera_{path.stem}")
    camera = bpy.data.objects.new(camera_data.name, camera_data)
    scene.collection.objects.link(camera)
    camera.hide_render = False
    camera_data.type = "ORTHO"
    horizontal_size = size.x if view_axis == "Y" else size.y
    camera_data.ortho_scale = max(size.z * 1.08, horizontal_size * 1.6)
    distance = max(size.length, 1.0) * 2.5
    if view_axis == "Y":
        camera.location = Vector(
            (center.x, center.y + view_sign * distance, center.z)
        )
    elif view_axis == "X":
        camera.location = Vector(
            (center.x + view_sign * distance, center.y, center.z)
        )
    else:
        raise ValueError(f"Unsupported diagnostic view axis: {view_axis}")
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera

    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.render.resolution_x = 600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.05, 0.05, 0.05)
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(camera, do_unlink=True)


def bone_depth(pose_bone):
    depth = 0
    parent = pose_bone.parent
    while parent:
        depth += 1
        parent = parent.parent
    return depth


def bake_world_space_retarget(
    scene,
    source,
    target,
    action_name="CC3_Idle_Baked",
    target_rest_delta_bones=TARGET_REST_DELTA_BONES,
    strip_forward_root_motion=False,
):
    pairs = [
        (source.pose.bones[source_name], target.pose.bones[target_name])
        for source_name, target_name in BONE_MAP.items()
        if source_name in source.pose.bones and target_name in target.pose.bones
    ]
    pairs.sort(key=lambda pair: bone_depth(pair[1]))
    if not pairs:
        raise RuntimeError("No source-to-target bone mappings were resolved")

    source_object_rotation = source.matrix_world.to_quaternion().normalized()
    target_object_rotation = target.matrix_world.to_quaternion().normalized()
    target_object_rotation_inverse = target_object_rotation.inverted()
    target_world_inverse = target.matrix_world.inverted()
    source_rest_world = {
        source_bone.name: (
            source_object_rotation
            @ source.data.bones[source_bone.name].matrix_local.to_quaternion()
        ).normalized()
        for source_bone, _ in pairs
    }
    target_rest_world = {
        target_bone.name: (
            target_object_rotation
            @ target.data.bones[target_bone.name].matrix_local.to_quaternion()
        ).normalized()
        for _, target_bone in pairs
    }
    bone_axis = Vector((0.0, 1.0, 0.0))
    torso_forward_correction = Quaternion(
        (1.0, 0.0, 0.0),
        math.radians(TORSO_FORWARD_CORRECTION_DEGREES),
    )
    source_hip_rest_head_world = (
        source.matrix_world
        @ source.data.bones["mixamorig:Hips"].head_local
    )
    target_hip_rest_head_world = (
        target.matrix_world
        @ target.data.bones["CC_Base_Hip"].head_local
    )
    source_hip_height = abs(source_hip_rest_head_world.z)
    target_hip_height = abs(target_hip_rest_head_world.z)
    hip_translation_scale = (
        target_hip_height / source_hip_height
        if source_hip_height > 1e-6
        else 1.0
    )

    target.animation_data_clear()
    target.animation_data_create()
    action = bpy.data.actions.new(action_name)
    target.animation_data.action = action
    for pose_bone in target.pose.bones:
        pose_bone.rotation_mode = "QUATERNION"
        pose_bone.matrix_basis.identity()

    for frame in range(scene.frame_start, scene.frame_end + 1):
        scene.frame_set(frame)
        for pose_bone in target.pose.bones:
            pose_bone.matrix_basis.identity()
        bpy.context.view_layer.update()
        source_hip_head_world = (
            source.matrix_world @ source.pose.bones["mixamorig:Hips"].head
        )
        hip_translation_world = (
            source_hip_head_world - source_hip_rest_head_world
        ) * hip_translation_scale
        if strip_forward_root_motion:
            hip_translation_world.y = 0.0
        target_hip_head_armature = target_world_inverse @ (
            target_hip_rest_head_world + hip_translation_world
        )

        for source_bone, target_bone in pairs:
            source_pose_world = (
                source_object_rotation @ source_bone.matrix.to_quaternion()
            ).normalized()
            source_rest_rotation = source_rest_world[source_bone.name]
            target_rest_rotation = target_rest_world[target_bone.name]
            if target_bone.name in target_rest_delta_bones:
                source_rest_delta = (
                    source_pose_world @ source_rest_rotation.inverted()
                ).normalized()
                desired_target_world = (
                    source_rest_delta @ target_rest_rotation
                ).normalized()
            else:
                source_rest_direction = (
                    source_rest_rotation @ bone_axis
                ).normalized()
                source_pose_direction = (
                    source_pose_world @ bone_axis
                ).normalized()
                source_swing = source_rest_direction.rotation_difference(
                    source_pose_direction
                )
                source_swing_rotation = (
                    source_swing @ source_rest_rotation
                ).normalized()
                source_twist = (
                    source_pose_world @ source_swing_rotation.inverted()
                ).normalized()

                target_rest_direction = (
                    target_rest_rotation @ bone_axis
                ).normalized()
                target_swing = target_rest_direction.rotation_difference(
                    source_pose_direction
                )
                target_swing_rotation = (
                    target_swing @ target_rest_rotation
                ).normalized()
                desired_target_world = (
                    source_twist @ target_swing_rotation
                ).normalized()
            if target_bone.name in TORSO_FORWARD_CORRECTION_BONES:
                desired_target_world = (
                    torso_forward_correction @ desired_target_world
                ).normalized()
            desired_target_armature = (
                target_object_rotation_inverse @ desired_target_world
            ).normalized()

            desired_matrix = desired_target_armature.to_matrix().to_4x4()
            desired_matrix.translation = (
                target_hip_head_armature
                if target_bone.name == "CC_Base_Hip"
                else target_bone.head.copy()
            )
            conversion_args = {
                "matrix": desired_matrix,
                "matrix_local": target_bone.bone.matrix_local,
                "invert": True,
            }
            if target_bone.parent:
                conversion_args["parent_matrix"] = target_bone.parent.matrix
                conversion_args["parent_matrix_local"] = (
                    target_bone.parent.bone.matrix_local
                )
            target_bone.matrix_basis = target_bone.bone.convert_local_to_pose(
                **conversion_args
            )
            bpy.context.view_layer.update()
            target_bone.keyframe_insert(
                data_path="location",
                frame=frame,
                group=target_bone.name,
            )
            target_bone.keyframe_insert(
                data_path="rotation_quaternion",
                frame=frame,
                group=target_bone.name,
            )
            target_bone.keyframe_insert(
                data_path="scale",
                frame=frame,
                group=target_bone.name,
            )

    scene.frame_set(scene.frame_start)
    bpy.context.view_layer.update()
    return action, len(pairs)


def write_pose_audit(scene, source, target):
    sample_frames = sorted({
        scene.frame_start,
        (scene.frame_start + scene.frame_end) // 2,
        scene.frame_end,
    })
    samples = {}
    maximum_error = 0.0
    for frame in sample_frames:
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        frame_audit = {}
        for source_name, target_name in BONE_MAP.items():
            if source_name not in source.pose.bones or target_name not in target.pose.bones:
                continue
            source_bone = source.pose.bones[source_name]
            target_bone = target.pose.bones[target_name]
            source_direction = (
                source.matrix_world.to_3x3() @ source_bone.vector
            ).normalized()
            target_direction = (
                target.matrix_world.to_3x3() @ target_bone.vector
            ).normalized()
            angle = math.degrees(source_direction.angle(target_direction))
            maximum_error = max(maximum_error, angle)
            frame_audit[source_name] = {
                "target": target_name,
                "direction_angle_degrees": round(angle, 4),
                "source_direction": [round(value, 6) for value in source_direction],
                "target_direction": [round(value, 6) for value in target_direction],
            }
        samples[str(frame)] = frame_audit

    audit = {
        "source": str(SOURCE_FBX.relative_to(PROJECT_ROOT)),
        "sample_frames": sample_frames,
        "maximum_direction_error_degrees": round(maximum_error, 6),
        "target_rest_delta_bones": sorted(TARGET_REST_DELTA_BONES),
        "torso_forward_correction_bones": sorted(
            TORSO_FORWARD_CORRECTION_BONES
        ),
        "torso_forward_correction_degrees": (
            TORSO_FORWARD_CORRECTION_DEGREES
        ),
        "samples": samples,
    }
    DIAGNOSTIC_AUDIT.write_text(json.dumps(audit, indent=2), encoding="utf-8")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DIAGNOSTIC_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()

    target_objects = import_fbx(CC3_FBX)
    target = find_armature(target_objects, "CC3_Base_Plus")
    if target.animation_data:
        target.animation_data_clear()
    target_visuals = [target] + [
        obj
        for obj in target_objects
        if obj.type == "MESH" and obj.find_armature() == target
    ]
    for pose_bone in target.pose.bones:
        pose_bone.matrix_basis.identity()
    render_diagnostic(
        DIAGNOSTIC_DIR / "cc3_bind_pose_side.png",
        target_visuals,
        0,
        view_axis="X",
        view_sign=-1,
    )
    if "--rest-only" in sys.argv:
        print(f"CC3_BIND_POSE={DIAGNOSTIC_DIR / 'cc3_bind_pose_side.png'}")
        return

    source_objects = import_fbx(SOURCE_FBX)
    source = find_armature(source_objects)
    if not source.animation_data or not source.animation_data.action:
        raise RuntimeError("Mixamo idle has no source action")

    source_visuals = [source] + [
        obj
        for obj in source_objects
        if obj.type == "MESH" and obj.find_armature() == source
    ]
    if len(source_visuals) == 1:
        reference_objects = import_fbx(SOURCE_REFERENCE_FBX)
        reference = find_armature(reference_objects)
        reference.animation_data_create()
        reference.animation_data.action = source.animation_data.action
        source_visuals = [reference] + [
            obj
            for obj in reference_objects
            if obj.type == "MESH" and obj.find_armature() == reference
        ]

    scene = bpy.context.scene
    scene.frame_start = int(source.animation_data.action.frame_range[0])
    scene.frame_end = int(source.animation_data.action.frame_range[1])
    baked_action, mapped_bone_count = bake_world_space_retarget(
        scene,
        source,
        target,
    )
    write_pose_audit(scene, source, target)

    sample_frame = scene.frame_start
    render_diagnostic(
        DIAGNOSTIC_DIR / "mixamo_idle_source_front.png",
        source_visuals,
        sample_frame,
        view_sign=-1,
    )
    render_diagnostic(
        DIAGNOSTIC_DIR / "cc3_idle_retarget_front.png",
        target_visuals,
        sample_frame,
        view_sign=-1,
    )
    render_diagnostic(
        DIAGNOSTIC_DIR / "mixamo_idle_source_side.png",
        source_visuals,
        sample_frame,
        view_axis="X",
        view_sign=-1,
    )
    render_diagnostic(
        DIAGNOSTIC_DIR / "cc3_idle_retarget_side.png",
        target_visuals,
        sample_frame,
        view_axis="X",
        view_sign=-1,
    )
    midpoint_frame = (scene.frame_start + scene.frame_end) // 2
    render_diagnostic(
        DIAGNOSTIC_DIR / "mixamo_idle_source_mid.png",
        source_visuals,
        midpoint_frame,
        view_sign=-1,
    )
    render_diagnostic(
        DIAGNOSTIC_DIR / "cc3_idle_retarget_mid.png",
        target_visuals,
        midpoint_frame,
        view_sign=-1,
    )

    for action in list(bpy.data.actions):
        if action != baked_action:
            bpy.data.actions.remove(action)

    bpy.ops.object.select_all(action="DESELECT")
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
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
    print(f"CC3_IDLE={OUTPUT_GLB}")
    print(f"FRAMES={scene.frame_start}-{scene.frame_end}")
    print(f"MAPPED_BONES={mapped_bone_count}")


if __name__ == "__main__":
    main()
