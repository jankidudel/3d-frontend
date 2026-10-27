"""Run in Blender background mode to import and render the owned OBJ appearance control."""

from pathlib import Path
import hashlib
import json
import tempfile
import zipfile
import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[1] / "public/examples/file-handoff"
archive = root / "obj-companion-bundle.zip"
observations = []
with tempfile.TemporaryDirectory(prefix="inspectmesh-obj-") as directory:
    for variant in ["complete", "missing-texture"]:
        folder = Path(directory) / variant
        folder.mkdir()
        with zipfile.ZipFile(archive) as package:
            package.extractall(folder)
        if variant == "missing-texture":
            (folder / "textures/checker.png").unlink()
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.wm.obj_import(filepath=str(folder / "sample.obj"), forward_axis='Y', up_axis='Z')
        objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
        assert len(objects) == 1
        obj = objects[0]
        assert tuple(round(value, 5) for value in obj.dimensions) == (20, 10, 5)
        materials = []
        for material in obj.data.materials:
            images = []
            for node in material.node_tree.nodes:
                if node.type == 'TEX_IMAGE' and node.image:
                    image_path = Path(bpy.path.abspath(node.image.filepath))
                    images.append({"reference": "textures/" + image_path.name, "fileExists": image_path.exists(), "hasPixelData": bool(node.image.has_data)})
            materials.append({"name": material.name, "images": images})
        scene = bpy.context.scene
        scene.render.engine = 'CYCLES'
        scene.cycles.device = 'CPU'
        scene.cycles.samples = 12
        scene.render.resolution_x = 640
        scene.render.resolution_y = 480
        scene.render.resolution_percentage = 100
        scene.world = bpy.data.worlds.new("neutral")
        scene.world.use_nodes = True
        scene.world.node_tree.nodes.get('Background').inputs[0].default_value = (0.12, 0.12, 0.12, 1)
        bpy.ops.object.camera_add(location=(38, -28, 27))
        camera = bpy.context.object
        camera.rotation_euler = (Vector((10, 5, 2.5)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera.data.type = 'ORTHO'
        camera.data.ortho_scale = 30
        scene.camera = camera
        bpy.ops.object.light_add(type='AREA', location=(10, -10, 35))
        bpy.context.object.data.energy = 18000
        bpy.context.object.data.shape = 'DISK'
        bpy.context.object.data.size = 20
        bpy.context.object.rotation_euler = (Vector((10, 5, 2.5)) - bpy.context.object.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = str(root / f"obj-{variant}.png")
        bpy.ops.render.render(write_still=True)
        observations.append({"variant": variant, "meshObjects": len(objects), "dimensionsInAgreedMm": list(obj.dimensions), "polygonFaces": len(obj.data.polygons), "materials": materials, "render": f"obj-{variant}.png"})
record = {"observedDate": "2026-10-27", "application": "Blender", "version": bpy.app.version_string,
          "operation": "Background wm.obj_import, Y forward/Z up, followed by Cycles CPU render. Same bundle, separate temporary copy missing only checker.png.",
          "bundleSha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
          "reproduction": "Blender --background --python scripts/capture-obj-receiver.py",
          "limitations": "Actual imported-scene renders, not GUI screenshots, slicer output or physical/manufactured colour tests. Other receivers and a missing-MTL variant remain untested.",
          "observations": observations}
(root / "obj-receiver-observation.json").write_text(json.dumps(record, indent=2) + "\n")
print("Captured complete and missing-texture OBJ imports in Blender.")
