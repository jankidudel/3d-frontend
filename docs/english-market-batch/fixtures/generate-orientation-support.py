"""Regenerate owned orientation, bridge and internal-support controls."""

from pathlib import Path
from itertools import product
import json
import math
import struct
import zipfile

ROOT = Path(__file__).resolve().parents[3] / "public/examples/orientation-support"
ROOT.mkdir(parents=True, exist_ok=True)


def triangle(a, b, c):
    return (a, b, c)


def quad(a, b, c, d):
    return [triangle(a, b, c), triangle(a, c, d)]


def bounds(faces):
    points = [point for face in faces for point in face]
    return {
        "min": [min(point[axis] for point in points) for axis in range(3)],
        "max": [max(point[axis] for point in points) for axis in range(3)],
    }


def write_stl(name, faces):
    data = bytearray(80)
    header = f"InspectMesh owned control: {name}".encode("ascii")
    data[: min(len(header), 80)] = header[:80]
    data += struct.pack("<I", len(faces))
    for a, b, c in faces:
        u = [b[i] - a[i] for i in range(3)]
        v = [c[i] - a[i] for i in range(3)]
        normal = (
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0],
        )
        magnitude = math.sqrt(sum(value * value for value in normal))
        normal = [value / magnitude for value in normal]
        data += struct.pack("<12fH", *normal, *a, *b, *c, 0)
    (ROOT / name).write_bytes(data)
    return {"triangles": len(faces), "bytes": len(data), "bounds": bounds(faces)}


def rectilinear_solid(x_values, y_values, z_values, is_solid):
    cells = set()
    for ix, iy, iz in product(
        range(len(x_values) - 1),
        range(len(y_values) - 1),
        range(len(z_values) - 1),
    ):
        centre = (
            (x_values[ix] + x_values[ix + 1]) / 2,
            (y_values[iy] + y_values[iy + 1]) / 2,
            (z_values[iz] + z_values[iz + 1]) / 2,
        )
        if is_solid(*centre):
            cells.add((ix, iy, iz))
    faces = []
    directions = (
        (-1, 0, 0),
        (1, 0, 0),
        (0, -1, 0),
        (0, 1, 0),
        (0, 0, -1),
        (0, 0, 1),
    )
    for ix, iy, iz in cells:
        x0, x1 = x_values[ix], x_values[ix + 1]
        y0, y1 = y_values[iy], y_values[iy + 1]
        z0, z1 = z_values[iz], z_values[iz + 1]
        outward = (
            ((x0, y0, z0), (x0, y0, z1), (x0, y1, z1), (x0, y1, z0)),
            ((x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)),
            ((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)),
            ((x0, y1, z0), (x0, y1, z1), (x1, y1, z1), (x1, y1, z0)),
            ((x0, y0, z0), (x0, y1, z0), (x1, y1, z0), (x1, y0, z0)),
            ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)),
        )
        for direction, corners in zip(directions, outward):
            neighbour = (
                ix + direction[0],
                iy + direction[1],
                iz + direction[2],
            )
            if neighbour not in cells:
                faces.extend(quad(*corners))
    return faces


def extrude_profile(profile, y0, y1):
    front = lambda i: (profile[i][0], y0, profile[i][1])
    back = lambda i: (profile[i][0], y1, profile[i][1])
    faces = []
    for index in range(1, len(profile) - 1):
        faces.append(triangle(front(0), front(index + 1), front(index)))
        faces.append(triangle(back(0), back(index), back(index + 1)))
    for index in range(len(profile)):
        following = (index + 1) % len(profile)
        faces.extend(
            quad(front(following), front(index), back(index), back(following))
        )
    return faces


def transform_faces(faces, rotate_degrees, translation):
    rx, ry, rz = [math.radians(value) for value in rotate_degrees]

    def apply(point):
        x, y, z = point
        y, z = y * math.cos(rx) - z * math.sin(rx), y * math.sin(rx) + z * math.cos(rx)
        x, z = x * math.cos(ry) + z * math.sin(ry), -x * math.sin(ry) + z * math.cos(ry)
        x, y = x * math.cos(rz) - y * math.sin(rz), x * math.sin(rz) + y * math.cos(rz)
        return tuple(value + offset for value, offset in zip((x, y, z), translation))

    return [tuple(apply(point) for point in face) for face in faces]


designed_block = extrude_profile([(0, 0), (40, 0), (40, 8), (36, 12), (0, 12)], 0, 25)
tilted_block = transform_faces(designed_block, (20, -15, 10), (8, -4, 3))

bridge = rectilinear_solid(
    [0, 10, 26, 36],
    [0, 10],
    [0, 10, 12],
    lambda x, _y, z: z >= 10 or x <= 10 or x >= 26,
)
cantilever = rectilinear_solid(
    [0, 10, 26],
    [0, 10],
    [0, 10, 12],
    lambda x, _y, z: z >= 10 or x <= 10,
)
through_channel = rectilinear_solid(
    [0, 40],
    [0, 6, 14, 20],
    [0, 4, 12, 20],
    lambda _x, y, z: not (6 < y < 14 and 4 < z < 12),
)
trapped_cavity = rectilinear_solid(
    [0, 8, 34, 40],
    [0, 5, 13, 17, 25, 30],
    [0, 4, 6, 10, 18, 24],
    lambda x, y, z: not (
        (8 < x < 34 and 5 < y < 25 and 4 < z < 18)
        or (x < 8 and 13 < y < 17 and 6 < z < 10)
    ),
)


def write_3mf(name, faces, transform):
    vertices = []
    vertex_ids = {}
    triangles = []
    for face in faces:
        indices = []
        for point in face:
            if point not in vertex_ids:
                vertex_ids[point] = len(vertices)
                vertices.append(point)
            indices.append(vertex_ids[point])
        triangles.append(indices)
    vertices_xml = "".join(
        f'<vertex x="{x}" y="{y}" z="{z}"/>' for x, y, z in vertices
    )
    triangles_xml = "".join(
        f'<triangle v1="{a}" v2="{b}" v3="{c}"/>' for a, b, c in triangles
    )
    model = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">'
        '<resources><object id="1" type="model" name="Asymmetric ramp"><mesh>'
        f'<vertices>{vertices_xml}</vertices><triangles>{triangles_xml}</triangles>'
        '</mesh></object></resources>'
        f'<build><item objectid="1" transform="{transform}"/></build></model>'
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>'
        '</Types>'
    )
    rels = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Target="/3D/3dmodel.model" Id="rel-1" '
        'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>'
        '</Relationships>'
    )
    path = ROOT / name
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path_name, text in (
            ("[Content_Types].xml", content_types),
            ("_rels/.rels", rels),
            ("3D/3dmodel.model", model),
        ):
            info = zipfile.ZipInfo(path_name, (2026, 10, 18, 12, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, text)
    return {"triangles": len(faces), "bytes": path.stat().st_size}


ramp = extrude_profile([(0, 0), (20, 0), (20, 4), (0, 12)], 0, 10)
manifest = {
    "generated": "2026-10-18",
    "licence": "Original InspectMesh mathematical geometry, reusable with attribution.",
    "physicalTesting": False,
    "unit": "millimetre assumption for STL; declared millimetre for 3MF",
    "controls": {
        "tilted-asymmetric-block.stl": {
            "designedDimensions": [40, 25, 12],
            "intendedBase": "40 x 25 mm source Z=0 face",
            "marker": "4 mm chamfer at the source +X/+Z edge",
            "transformDegreesXYZ": [20, -15, 10],
            "translation": [8, -4, 3],
            **write_stl("tilted-asymmetric-block.stl", tilted_block),
        },
        "bridge-roof.stl": {
            "pillarDimensions": [10, 10, 10],
            "gap": 16,
            "roofThickness": 2,
            "roofUndersideArea": 160,
            **write_stl("bridge-roof.stl", bridge),
        },
        "cantilever-roof.stl": {
            "baseDimensions": [10, 10, 10],
            "unsupportedSpan": 16,
            "roofThickness": 2,
            "roofUndersideArea": 160,
            **write_stl("cantilever-roof.stl", cantilever),
        },
        "straight-through-channel.stl": {
            "outerDimensions": [40, 20, 20],
            "channelDimensions": [40, 8, 8],
            "removalDirection": "straight through source X",
            **write_stl("straight-through-channel.stl", through_channel),
        },
        "narrow-access-cavity.stl": {
            "outerDimensions": [40, 30, 24],
            "chamberDimensions": [26, 20, 14],
            "accessOpening": [4, 4],
            "accessDirection": "source -X through an 8 mm long 4 x 4 mm neck",
            **write_stl("narrow-access-cavity.stl", trapped_cavity),
        },
        "translated-ramp.3mf": {
            "transform": "translation only: +30 mm X",
            **write_3mf(
                "translated-ramp.3mf", ramp, "1 0 0 0 1 0 0 0 1 30 0 0"
            ),
        },
        "rotated-ramp.3mf": {
            "transform": "180 degrees about X, then translated to positive Y/Z",
            **write_3mf(
                "rotated-ramp.3mf", ramp, "1 0 0 0 -1 0 0 0 -1 30 10 12"
            ),
        },
    },
}
(ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps(manifest, indent=2))
