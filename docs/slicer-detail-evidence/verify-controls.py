"""Independently decode saved STL controls; do not import the generator.

Run with python3. Analytic volumes and point-in-solid checks below are an
independent specification, not expectations read from the generated manifest.
"""

from collections import defaultdict
import hashlib
import json
import math
from pathlib import Path
import struct
import unittest

ROOT = Path(__file__).resolve().parent


def decode(data):
    count = struct.unpack_from('<I', data, 80)[0]
    assert len(data) == 84 + count * 50
    triangles = []
    for index in range(count):
        record = struct.unpack_from('<12fH', data, 84 + index * 50)
        assert all(math.isfinite(value) for value in record[:12])
        triangles.append(tuple(tuple(record[3 + a * 3:6 + a * 3]) for a in range(3)))
    return triangles


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def inspect(triangles):
    edges = defaultdict(list)
    volume = 0
    for index, (a, b, c) in enumerate(triangles):
        normal = cross(tuple(b[k] - a[k] for k in range(3)),
                       tuple(c[k] - a[k] for k in range(3)))
        assert sum(value * value for value in normal) > 0
        assert sum(value != 0 for value in normal) == 1, 'Expected orthogonal boundary'
        volume += sum(a[k] * cross(b, c)[k] for k in range(3)) / 6
        for start, end in ((a, b), (b, c), (c, a)):
            edges[tuple(sorted((start, end)))].append((index, start < end))
    neighbours = defaultdict(set)
    for pair in edges.values():
        assert len(pair) == 2, 'Boundary or over-shared edge'
        assert pair[0][1] != pair[1][1], 'Winding conflict'
        neighbours[pair[0][0]].add(pair[1][0])
        neighbours[pair[1][0]].add(pair[0][0])
    reached, pending = set(), [0]
    while pending:
        current = pending.pop()
        if current not in reached:
            reached.add(current)
            pending.extend(neighbours[current] - reached)
    assert len(reached) == len(triangles), 'More than one edge-connected shell'
    vertices = {vertex for triangle in triangles for vertex in triangle}
    bounds = [[min(v[a] for v in vertices), max(v[a] for v in vertices)] for a in range(3)]
    return {'triangles': len(triangles), 'edge_connected_shells': 1,
            'boundary_edges': 0, 'over_shared_edges': 0, 'winding_conflicts': 0,
            'bounds': bounds, 'signed_volume_mm3': volume}


def inside(triangles, point):
    """Parity ray along +X, tested on the independent control below.

    Intersect complete triangle interiors in YZ. Deduplicate coplanar diagonal
    hits, and avoid edge/vertex-aligned query points in the specifications.
    """
    intersections = set()
    for a, b, c in triangles:
        if a[0] != b[0] or a[0] != c[0] or a[0] <= point[0]:
            continue
        denominator = (b[2] - c[2]) * (a[1] - c[1]) + (c[1] - b[1]) * (a[2] - c[2])
        u = ((b[2] - c[2]) * (point[1] - c[1]) +
             (c[1] - b[1]) * (point[2] - c[2])) / denominator
        v = ((c[2] - a[2]) * (point[1] - c[1]) +
             (a[1] - c[1]) * (point[2] - c[2])) / denominator
        if u >= 0 and v >= 0 and u + v <= 1:
            intersections.add(a[0])
    return len(intersections) % 2 == 1


class Controls(unittest.TestCase):
    def test_saved_geometry(self):
        expected = {
            'T1': ([40, 24, 2.6], 1938.867),
            'T2': ([40, 24, 2.6], 1955.136),
            'T3': ([40, 24, 2.1], 1925.856),
            'T4': ([40, 24, 2], 1901.133),
            'V1': ([24, 24, 30], 17280),
            'V2': ([24, 24, 30], 3843.072),
            'V3': ([24, 24, 30], 13440),
            'R-box': ([30, 30, 10], 9000),
        }
        manifest = json.loads((ROOT / 'inputs.json').read_text())
        self.assertEqual({item['id'] for item in manifest['files']}, set(expected))
        observations = []
        for item in manifest['files']:
            with self.subTest(control=item['id']):
                data = (ROOT / item['file']).read_bytes()
                self.assertEqual(hashlib.sha256(data).hexdigest(), item['sha256'])
                observed = inspect(decode(data))
                spans, volume = expected[item['id']]
                for axis, span in enumerate(spans):
                    self.assertEqual(observed['bounds'][axis][0], 0)
                    self.assertAlmostEqual(observed['bounds'][axis][1], span, places=5)
                self.assertAlmostEqual(observed['signed_volume_mm3'], volume, delta=0.005)
                observations.append({'id': item['id'], 'sha256': item['sha256'], **observed})
        self.observations = observations
        # Write only after every independent control assertion passes.
        (ROOT / 'geometry-observations.json').write_text(json.dumps({
            'method': 'Independent serialized Float32 STL decoding, signed volume, edge topology and point parity',
            'coordinate_unit': 'assumed mm',
            'coverage': 'These orthogonal controls only; not a general self-intersection detector or slicer observation',
            'controls': observations,
        }, indent=2) + '\n')

    def test_named_material_and_void_regions(self):
        cases = {
            'T1': [((4.1, 10.13, 2.31), True), ((4.5, 10.13, 2.31), False),
                   ((7, 10.13, 2.31), False), ((17.2, 10.13, 2.31), True),
                   ((20, 12.13, 2.31), True), ((30.4, 10.13, 2.31), True)],
            'T2': [((4.5, 10.13, 2.31), True), ((7, 10.13, 2.31), False),
                   ((20, 12.3, 2.31), True), ((20, 10.13, 2.31), False)],
            'T3': [((4.5, 10.13, 2.05), True), ((4.5, 10.13, 2.15), False)],
            'T4': [((4.1, 10.13, 1.71), False), ((7, 10.13, 1.71), True),
                   ((4.1, 10.13, 1.31), True), ((17.2, 10.13, 1.71), False)],
            'V1': [((12, 12.13, 20.31), True)],
            'V2': [((12, 12.13, 0.61), True), ((12, 12.13, 2.31), False),
                   ((0.6, 12.13, 20.31), True)],
            'V3': [((12, 12.13, 5.31), True), ((12, 12.13, 10.31), False),
                   ((4, 12.13, 20.31), True), ((20, 12.13, 20.31), True)],
            'R-box': [((15, 15.13, 9.91), True)],
        }
        for name, queries in cases.items():
            triangles = decode((ROOT / 'inputs' / f'{name}.stl').read_bytes())
            for point, result in queries:
                with self.subTest(control=name, point=point):
                    self.assertEqual(inside(triangles, point), result)

    def test_rejects_missing_and_reversed_faces(self):
        triangles = decode((ROOT / 'inputs' / 'R-box.stl').read_bytes())
        with self.assertRaises(AssertionError):
            inspect(triangles[1:])
        reversed_face = [tuple(reversed(triangles[0])), *triangles[1:]]
        with self.assertRaises(AssertionError):
            inspect(reversed_face)

    def test_ray_crossing_reference(self):
        # Independent two-square boundary, not generated by the mesher.
        triangles = [((0, 0, 0), (0, 3, 0), (0, 3, 4)),
                     ((0, 0, 0), (0, 3, 4), (0, 0, 4)),
                     ((2, 0, 0), (2, 3, 0), (2, 3, 4)),
                     ((2, 0, 0), (2, 3, 4), (2, 0, 4))]
        self.assertTrue(inside(triangles, (1, 1.1, 2.3)))
        self.assertFalse(inside(triangles, (-1, 1.1, 2.3)))
        self.assertFalse(inside(triangles, (3, 1.1, 2.3)))
        self.assertFalse(inside(triangles, (1, 4.1, 2.3)))


if __name__ == '__main__':
    unittest.main()
