"""Regenerate the original, millimetre-assumed STL slicer diagnosis controls."""

from pathlib import Path
import math
import struct

ROOT = Path(__file__).resolve().parents[3] / "public/examples/slicer-diagnosis"
ROOT.mkdir(parents=True, exist_ok=True)


def triangle(a, b, c):
    return (a, b, c)


def quad(a, b, c, d):
    return [triangle(a, b, c), triangle(a, c, d)]


def cube(x0, x1, y0, y1, z0, z1):
    p = {
        "000": (x0, y0, z0), "100": (x1, y0, z0),
        "110": (x1, y1, z0), "010": (x0, y1, z0),
        "001": (x0, y0, z1), "101": (x1, y0, z1),
        "111": (x1, y1, z1), "011": (x0, y1, z1),
    }
    return sum((quad(*(p[k] for k in face)) for face in (
        ("000", "010", "110", "100"),
        ("001", "101", "111", "011"),
        ("000", "100", "101", "001"),
        ("010", "011", "111", "110"),
        ("000", "001", "011", "010"),
        ("100", "110", "111", "101"),
    )), [])


def floating_arm():
    # A single closed extrusion with an integral 20 mm horizontal overhang.
    profile = [(0, 0), (10, 0), (10, 10), (30, 10), (30, 20), (0, 20)]
    caps = [(0, 1, 2), (0, 2, 5), (2, 3, 4), (2, 4, 5)]
    front = lambda i: (profile[i][0], 0, profile[i][1])
    back = lambda i: (profile[i][0], 10, profile[i][1])
    faces = []
    for a, b, c in caps:
        faces.append(triangle(front(a), front(b), front(c)))
        faces.append(triangle(back(c), back(b), back(a)))
    for i in range(len(profile)):
        j = (i + 1) % len(profile)
        faces.extend(quad(front(j), front(i), back(i), back(j)))
    return faces


def tube():
    # Outer 20 x 20 x 10 box with a 6 x 6 through-passage.
    faces = []
    for corners in (
        ((-10, -10), (-3, -3), (-3, 3), (-10, 10)),
        ((-10, -10), (10, -10), (3, -3), (-3, -3)),
        ((10, -10), (10, 10), (3, 3), (3, -3)),
        ((10, 10), (-10, 10), (-3, 3), (3, 3)),
    ):
        faces.extend(quad(*((x, y, 10) for x, y in corners)))
        faces.extend(quad(*((x, y, 0) for x, y in reversed(corners))))
    for loop in (
        [(-10, -10), (10, -10), (10, 10), (-10, 10)],
        [(-3, -3), (-3, 3), (3, 3), (3, -3)],
    ):
        for i, (x0, y0) in enumerate(loop):
            x1, y1 = loop[(i + 1) % len(loop)]
            faces.extend(quad((x0, y0, 0), (x1, y1, 0),
                              (x1, y1, 10), (x0, y0, 10)))
    return faces


def write_stl(name, faces):
    data = bytearray(80)
    data[:len(name)] = name.encode("ascii")
    data += struct.pack("<I", len(faces))
    for a, b, c in faces:
        u = [b[i] - a[i] for i in range(3)]
        v = [c[i] - a[i] for i in range(3)]
        n = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
        mag = math.sqrt(sum(value*value for value in n))
        normal = [value/mag for value in n]
        data += struct.pack("<12fH", *normal, *a, *b, *c, 0)
    path = ROOT / name
    path.write_bytes(data)
    print(name, len(faces), len(data))


write_stl("integral-overhang.stl", floating_arm())
write_stl("detached-tetrahedron.stl", cube(0, 10, 0, 10, 0, 10) + [
    triangle((20, 0, 0), (24, 0, 0), (22, 4, 0)),
    triangle((20, 0, 0), (22, 2, 4), (24, 0, 0)),
    triangle((24, 0, 0), (22, 2, 4), (22, 4, 0)),
    triangle((22, 4, 0), (22, 2, 4), (20, 0, 0)),
])
write_stl("two-intended-cubes.stl", cube(0, 10, 0, 10, 0, 10) + cube(20, 30, 0, 10, 0, 10))
write_stl("origin-cube.stl", cube(0, 20, 0, 20, 0, 20))
write_stl("shifted-cube.stl", cube(230, 250, 20, 40, -5, 15))
write_stl("open-through-channel.stl", tube())
write_stl("capped-channel.stl", cube(-10, 10, -10, 10, 0, 10))
write_stl("overlapping-channel.stl", tube() + cube(-4, 4, -4, 4, 0, 10))
