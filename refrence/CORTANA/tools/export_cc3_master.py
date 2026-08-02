"""Non-destructive CC3 FBX audit and glTF master export for the web runtime."""

import json
import os
import sys
from pathlib import Path

import bpy


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SOURCE_FBX = PROJECT_ROOT / "model/test/Blender/blender.Fbx"
TEXTURE_ROOT = PROJECT_ROOT / "model/test/Blender/textures"
OUTPUT_DIR = PROJECT_ROOT / "model/cc3"
OUTPUT_GLB = OUTPUT_DIR / "cc3_master.glb"
REPORT_PATH = OUTPUT_DIR / "cc3_audit.json"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.materials, bpy.data.meshes, bpy.data.armatures, bpy.data.images):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def make_paths_relative():
    for image in bpy.data.images:
        if not image.filepath:
            continue
        image.filepath = bpy.path.relpath(image.filepath, start=str(OUTPUT_DIR))


def mesh_report(obj):
    shape_keys = obj.data.shape_keys
    return {
        "name": obj.name,
        "vertices": len(obj.data.vertices),
        "polygons": len(obj.data.polygons),
        "uv_layers": [layer.name for layer in obj.data.uv_layers],
        "material_slots": [slot.material.name if slot.material else None for slot in obj.material_slots],
        "shape_keys": [key.name for key in shape_keys.key_blocks] if shape_keys else [],
        "armature": obj.find_armature().name if obj.find_armature() else None,
    }


def material_report(material):
    images = []
    if material.use_nodes and material.node_tree:
        for node in material.node_tree.nodes:
            if node.type == "TEX_IMAGE" and node.image:
                images.append({"name": node.image.name, "path": node.image.filepath})
    return {
        "name": material.name,
        "use_nodes": material.use_nodes,
        "blend_method": material.blend_method,
        "images": images,
    }


def main():
    if not SOURCE_FBX.exists():
        raise FileNotFoundError(SOURCE_FBX)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    clear_scene()
    bpy.ops.import_scene.fbx(
        filepath=str(SOURCE_FBX),
        use_manual_orientation=False,
        automatic_bone_orientation=False,
        ignore_leaf_bones=False,
        use_anim=True,
        use_image_search=True,
    )

    # Keep the exporter from emitting the helper plane/camera if present.
    excluded = {"Shadow_Catcher", "Plane_001", "Preview_Camera", "CC_Base_Pivot"}
    for obj in bpy.context.scene.objects:
        if obj.name in excluded:
            obj.hide_render = True
            obj.hide_viewport = True
            obj.select_set(False)

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH" and not obj.hide_viewport]
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    materials = list(bpy.data.materials)
    images = list(bpy.data.images)

    report = {
        "source": str(SOURCE_FBX.relative_to(PROJECT_ROOT)),
        "texture_root": str(TEXTURE_ROOT.relative_to(PROJECT_ROOT)),
        "mesh_count": len(meshes),
        "armatures": [{"name": arm.name, "bones": len(arm.data.bones)} for arm in armatures],
        "meshes": [mesh_report(mesh) for mesh in meshes],
        "materials": [material_report(material) for material in materials],
        "images": [{"name": image.name, "path": image.filepath, "packed": bool(image.packed_file)} for image in images],
        "actions": [{"name": action.name, "fcurves": len(action.fcurves)} for action in bpy.data.actions],
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")

    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type in {"MESH", "ARMATURE"} and not obj.hide_viewport:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = armatures[0] if armatures else (meshes[0] if meshes else None)

    # This is the uncompressed visual master. Compression is a separate later step.
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT_GLB),
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
        export_vertex_color="MATERIAL",
        export_all_vertex_colors=True,
        export_cameras=False,
        export_lights=False,
        export_yup=True,
        export_animations=True,
        export_frame_range=True,
        export_morph=True,
        export_skins=True,
        export_def_bones=True,
        export_all_influences=True,
        export_apply=False,
        export_image_format="AUTO",
    )
    make_paths_relative()
    print(f"CC3_AUDIT={REPORT_PATH}")
    print(f"CC3_MASTER={OUTPUT_GLB}")


if __name__ == "__main__":
    main()
