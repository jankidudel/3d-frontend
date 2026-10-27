"""Reproduce original CC0 handoff assets; no third-party model or texture data."""

from pathlib import Path
import csv
import hashlib
import json
import struct
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1] / "public/examples/file-handoff"
ROOT.mkdir(parents=True, exist_ok=True)

vertices = [(0, 0, 0), (20, 0, 0), (20, 10, 0), (0, 10, 0),
            (0, 0, 5), (20, 0, 5), (20, 10, 5), (0, 10, 5)]
faces = [(1, 4, 3, 2), (5, 6, 7, 8), (1, 2, 6, 5),
         (2, 3, 7, 6), (3, 4, 8, 7), (4, 1, 5, 8)]
obj = "# Original InspectMesh control. Coordinates intended as mm; OBJ declares no unit.\n"
obj += "mtllib sample.mtl\no checker_block\n"
obj += "".join(f"v {x} {y} {z}\n" for x, y, z in vertices)
obj += "vt 0 0\nvt 1 0\nvt 1 1\nvt 0 1\nusemtl checker\n"
obj += "".join("f " + " ".join(f"{v}/{i+1}" for i, v in enumerate(face)) + "\n" for face in faces)
mtl = "# Original InspectMesh appearance control\nnewmtl checker\nKd 1 1 1\nmap_Kd textures/checker.png\n"

def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

pixels = b"".join(b"\x00" + b"".join(bytes((30, 70, 120) if (x//4 + y//4) % 2 else (245, 195, 60))
                                   for x in range(16)) for y in range(16))
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 16, 16, 8, 2, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(pixels, 9)) + chunk(b"IEND", b"")
readme = """# Original OBJ companion-file control

CC0-1.0, InspectMesh, 27 October 2026. Reproduce with
`python3 scripts/generate-handoff-assets.py` from the frontend repository.

Inventory: sample.obj, sample.mtl, textures/checker.png, README.md.
The closed block has eight coordinate vertices, six outward-wound quad faces,
and spans X=0..20, Y=0..10, Z=0..5. Coordinates are intended as millimetres;
OBJ has no authoritative unit declaration. Analytical volume is 1,000 mm3.
Each face maps the original blue/yellow 16 x 16 checker texture through four UVs.
The OBJ references sample.mtl, whose checker material references textures/checker.png.

Extract the entire ZIP into a fresh directory. Open sample.obj in an application
that supports OBJ/MTL/image textures; record its version, import options, bounds,
and actual appearance. On a working copy remove the texture, then the MTL, to
observe the different missing-reference stages. Preserve the complete original.
Geometry may still open when appearance is missing. No receiving-application
appearance or printed-colour observation has been made for this control.
InspectMesh does not accept OBJ, MTL or ZIP uploads in its STL/3MF tools.
"""
inventory = {"sample.obj": obj.encode(), "sample.mtl": mtl.encode(),
             "textures/checker.png": png, "README.md": readme.encode()}
with zipfile.ZipFile(ROOT / "obj-companion-bundle.zip", "w", compression=zipfile.ZIP_STORED) as archive:
    for name, data in inventory.items():
        info = zipfile.ZipInfo(name, date_time=(2026, 10, 27, 0, 0, 0))
        info.external_attr = 0o100644 << 16
        archive.writestr(info, data)

fields = ["Source and derivative", "Producing application", "Receiving application",
          "Required information", "Expected reference", "Observation", "Import options",
          "Unresolved limitation", "Next action"]
with (ROOT / "receiving-check-blank.csv").open("w", newline="") as file:
    writer = csv.writer(file)
    writer.writerow(["Field", "Recorded evidence"])
    writer.writerows((field, "") for field in fields)

def svg(name, title, body):
    (ROOT / name).write_text(f'''<svg xmlns="http://www.w3.org/2000/svg" width="720" height="360" viewBox="0 0 720 360" role="img" aria-labelledby="title">
<title id="title">{title}</title><rect width="720" height="360" rx="12" fill="#f5f7fb"/>
<g font-family="Arial, sans-serif" fill="#17283d">{body}</g></svg>\n''')

svg("coordinates-and-records.svg", "Placed coordinates versus editable build records", '''
<text x="24" y="34" font-size="22">Same placed geometry, different retained records</text>
<rect x="32" y="70" width="300" height="190" rx="8" fill="#dce9fb"/>
<text x="48" y="100" font-size="19">3MF: resource 1, two build items</text>
<rect x="60" y="125" width="65" height="65" fill="#235a90"/>
<rect x="215" y="125" width="65" height="65" fill="#235a90"/>
<text x="48" y="222" font-size="17">X: 0..20 and 40..60 mm</text>
<text x="48" y="246" font-size="16">Unit + separate placement transforms</text>
<rect x="352" y="70" width="336" height="190" rx="8" fill="#e3eee7"/>
<text x="368" y="100" font-size="19">STL: placed vertex coordinates</text>
<rect x="380" y="125" width="65" height="65" fill="#286345"/>
<rect x="535" y="125" width="65" height="65" fill="#286345"/>
<text x="368" y="222" font-size="17">X: 0..20 and 40..60, assume mm</text>
<text x="368" y="246" font-size="16">No unit or editable placement record</text>
<text x="24" y="303" font-size="17">Generated schematic. Recentring in a receiver is a separate operation.</text>
<text x="24" y="330" font-size="16">This diagram is not an application screenshot or physical measurement.</text>''')

svg("obj-bundle.svg", "OBJ to MTL to texture companion references", '''
<text x="24" y="34" font-size="22">A complete OBJ appearance bundle</text>
<rect x="24" y="65" width="315" height="105" rx="8" fill="#dce9fb"/>
<text x="40" y="95" font-size="20">sample.obj</text><text x="40" y="126" font-size="17">mtllib sample.mtl</text>
<text x="40" y="151" font-size="17">usemtl checker</text>
<path d="M339 118 L370 118" stroke="#17283d" stroke-width="3"/>
<rect x="370" y="65" width="326" height="105" rx="8" fill="#e3eee7"/>
<text x="386" y="95" font-size="20">sample.mtl</text><text x="386" y="126" font-size="17">newmtl checker</text>
<text x="386" y="151" font-size="17">map_Kd textures/checker.png</text>
<path d="M532 170 L532 200" stroke="#17283d" stroke-width="3"/>
<rect x="370" y="200" width="326" height="72" rx="8" fill="#f5c33c"/>
<text x="386" y="230" font-size="19">textures/checker.png</text>
<text x="386" y="255" font-size="16">Original blue/yellow 16 x 16 image</text>
<text x="24" y="308" font-size="17">Missing MTL: breaks material lookup. Missing PNG: breaks image lookup.</text>
<text x="24" y="335" font-size="16">Reference diagram only. Receiver appearance remains untested.</text>''')

svg("passage-and-boundary.svg", "Intact material around a passage versus a missing face", '''
<text x="24" y="34" font-size="22">Empty passage and unfinished surface are different</text>
<path d="M40 75 H345 V255 H40 Z M162 141 V189 H223 V141 Z" fill="#235a90" fill-rule="evenodd"/>
<text x="50" y="102" fill="white" font-size="17">Material section at Z=5 mm</text>
<text x="160" y="171" font-size="16">8 mm</text>
<text x="40" y="282" font-size="17">40 x 30 outer section; intact tunnel walls</text>
<path d="M470 110 L580 75 L660 135 L550 175 Z M470 110 V230 L550 270 V175 M550 270 L660 220 V135" fill="none" stroke="#235a90" stroke-width="4"/>
<path d="M470 110 V230 L550 270 V175 Z" fill="#f5c33c" fill-opacity="0.4" stroke="#8a5200" stroke-width="3" stroke-dasharray="7 5"/>
<text x="440" y="300" font-size="17">Missing face: four boundary edges</text>
<text x="24" y="334" font-size="16">Analytical diagrams, not captured sections. No drainage or strength test.</text>''')

svg("triangle-record.svg", "One STL facet contains three coordinates and a normal", '''
<text x="24" y="34" font-size="22">One flat facet, no shared-vertex topology record</text>
<path d="M65 250 L300 250 L65 65 Z" fill="#dce9fb" stroke="#235a90" stroke-width="3"/>
<text x="48" y="278" font-size="17">A (0,0,0)</text><text x="220" y="278" font-size="17">B (20,0,0)</text>
<text x="40" y="55" font-size="17">C (0,20,0)</text>
<text x="355" y="90" font-size="18">facet normal 0 0 1</text><text x="370" y="124" font-size="18">vertex 0 0 0</text>
<text x="370" y="158" font-size="18">vertex 20 0 0</text><text x="370" y="192" font-size="18">vertex 0 20 0</text>
<text x="355" y="238" font-size="17">Normal points along +Z, out of this view.</text>
<text x="24" y="328" font-size="17">Illustrative ASCII fields. Adjacent facets repeat coordinates; tools infer joins.</text>''')

manifest = {"rights": "Original InspectMesh assets, CC0-1.0", "createdDate": "2026-10-27",
            "generator": "scripts/generate-handoff-assets.py", "receiverAppearance": "untested",
            "obj": {"bounds": [[0, 20], [0, 10], [0, 5]], "vertices": 8, "quadFaces": 6,
                    "analyticalVolumeMm3": 1000, "coordinateConvention": "millimetres by agreement"},
            "bundleFiles": [{"name": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                            for name, data in inventory.items()]}
(ROOT / "assets.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("Generated OBJ bundle, blank receiving record and four explanatory diagrams.")
