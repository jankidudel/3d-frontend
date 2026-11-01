"""Original orthogonal geometry, not slicer output. Python standard library only.

Generate the boundary of a rectilinear cell union, removing internal faces.
The same coordinate grid subdivides every face, avoiding overlapping solids
and T-junctions where glyphs attach to the plaque. No external font is used.
"""

import hashlib
import itertools
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parent


def glyphs(widths, z0, z1):
    """Original O, H and I outlines. O/H outer extents stay fixed when widened."""
    o, h, i = widths
    return [
        (4, 6, z0, 4 + o, 18, z1),
        (10 - o, 6, z0, 10, 18, z1),
        (4, 6, z0, 10, 6 + o, z1),
        (4, 18 - o, z0, 10, 18, z1),
        (17, 6, z0, 17 + h, 18, z1),
        (23 - h, 6, z0, 23, 18, z1),
        (17, 12 - h / 2, z0, 23, 12 + h / 2, z1),
        (30, 6, z0, 30 + i, 18, z1),
    ]


def contains(box, point):
    return all(box[axis] < point[axis] < box[axis + 3] for axis in range(3))


def boundary(solids, cuts):
    axes = [sorted({box[a] for box in solids + cuts} |
                   {box[a + 3] for box in solids + cuts}) for a in range(3)]
    occupied = set()
    for cell in itertools.product(*(range(len(axis) - 1) for axis in axes)):
        point = [(axes[a][cell[a]] + axes[a][cell[a] + 1]) / 2 for a in range(3)]
        if any(contains(box, point) for box in solids) and not any(
                contains(box, point) for box in cuts):
            occupied.add(cell)
    triangles = []
    for cell in sorted(occupied):
        x0, y0, z0 = [axes[a][cell[a]] for a in range(3)]
        x1, y1, z1 = [axes[a][cell[a] + 1] for a in range(3)]
        for axis, sign in itertools.product(range(3), (-1, 1)):
            neighbour = list(cell)
            neighbour[axis] += sign
            if tuple(neighbour) in occupied:
                continue
            if axis == 0:
                x = x0 if sign < 0 else x1
                quad = [(x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1)]
            elif axis == 1:
                y = y0 if sign < 0 else y1
                quad = [(x0, y, z0), (x0, y, z1), (x1, y, z1), (x1, y, z0)]
            else:
                z = z0 if sign < 0 else z1
                quad = [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)]
            if sign < 0:
                quad.reverse()
            triangles.extend([(quad[0], quad[1], quad[2]),
                              (quad[0], quad[2], quad[3])])
    return triangles


def serialize(triangles):
    data = bytearray(b'InspectMesh original cell-union control; assume mm'.ljust(80, b' '))
    data.extend(struct.pack('<I', len(triangles)))
    for a, b, c in triangles:
        u, v = [b[k] - a[k] for k in range(3)], [c[k] - a[k] for k in range(3)]
        normal = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2],
                  u[0] * v[1] - u[1] * v[0])
        length = sum(value * value for value in normal) ** 0.5
        normal = [value / length for value in normal]
        data.extend(struct.pack('<12fH', *normal, *a, *b, *c, 0))
    return bytes(data)


def main():
    plaque = (0, 0, 0, 40, 24, 2)
    models = {
        'T1': ([plaque, *glyphs((0.25, 0.45, 0.80), 2, 2.6)], []),
        'T2': ([plaque, *glyphs((0.80, 0.80, 0.80), 2, 2.6)], []),
        'T3': ([plaque, *glyphs((0.80, 0.80, 0.80), 2, 2.1)], []),
        'T4': ([plaque], glyphs((0.25, 0.45, 0.80), 1.4, 2)),
        'V1': ([(0, 0, 0, 24, 24, 30)], []),
        'V2': ([(0, 0, 0, 24, 24, 30)], [(1.2, 1.2, 1.2, 22.8, 22.8, 31)]),
        'V3': ([(0, 0, 0, 24, 24, 10), (0, 0, 10, 8, 24, 30),
                (16, 0, 10, 24, 24, 30)], []),
        'R-box': ([(0, 0, 0, 30, 30, 10)], []),
    }
    output = ROOT / 'inputs'
    output.mkdir(exist_ok=True)
    files = []
    for identifier, (solids, cuts) in models.items():
        data = serialize(boundary(solids, cuts))
        name = f'{identifier}.stl'
        (output / name).write_bytes(data)
        files.append({'id': identifier, 'file': f'inputs/{name}',
                      'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                      'solid_boxes': solids, 'subtracted_boxes': cuts})
    manifest = {
        'format': 'binary STL', 'coordinate_convention': 'millimetres assumed; STL has no unit',
        'orientation': '+Z up, plaque lower corner at origin; relief starts at Z=2',
        'provenance': 'Original InspectMesh O/H/I polygon lettering, no font or CAD dependency',
        'glyph_regions_xy': {'O': [4, 6, 10, 18], 'H': [17, 6, 23, 18], 'I': [30, 6, 30.8, 18]},
        'narrow_widths_mm': {'O': 0.25, 'H': 0.45, 'I': 0.8},
        'widened_widths_mm': {'O': 0.8, 'H': 0.8, 'I': 0.8},
        'relief_interval_mm': {'T1': [2, 2.6], 'T2': [2, 2.6], 'T3': [2, 2.1], 'T4': [1.4, 2]},
        'branch_interval_mm': {'V3': [10, 30]},
        'files': files,
    }
    (ROOT / 'inputs.json').write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
