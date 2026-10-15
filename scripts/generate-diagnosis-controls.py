"""Original bounded geometry controls; preserves independent stored-normal and winding faults."""
from pathlib import Path
import struct
root = Path(__file__).resolve().parents[1] / 'public/examples'
source = (root / 'english-market-batch/closed-20mm-cube.stl').read_bytes()
assert len(source) == 684 and struct.unpack_from('<I', source, 80)[0] == 12
out = root / 'diagnosis'
out.mkdir(exist_ok=True)
# Reverse the first triangle's vertex order, leaving its stored normal untouched.
reversed_face = bytearray(source)
reversed_face[108:120], reversed_face[120:132] = source[120:132], source[108:120]
(out / 'reversed-winding-cube.stl').write_bytes(reversed_face)
normal_only = bytearray(source)
# Deliberately incorrect stored vector; vertex winding remains the closed reference.
struct.pack_into('<fff', normal_only, 84, 0, 0, 1)
(out / 'stored-normal-cube.stl').write_bytes(normal_only)
separated = bytearray(source)
struct.pack_into('<I', separated, 80, 24)
for face in range(12):
    record = bytearray(source[84+face*50:134+face*50])
    for vertex in range(3):
        offset = 12 + vertex*12
        struct.pack_into('<f', record, offset, struct.unpack_from('<f', record, offset)[0]+40)
    separated.extend(record)
(out / 'separated-cubes.stl').write_bytes(separated)
(out / 'malformed.stl').write_text('This bounded file deliberately contains no STL geometry.\n')

# Additional topology controls. Each binary STL is built from explicit triangle
# records so the published coordinates can be reproduced without a CAD package.
def records(data):
    count = struct.unpack_from('<I', data, 80)[0]
    return [bytes(data[84 + i * 50:134 + i * 50]) for i in range(count)]

def write(name, triangles):
    header = bytearray(80)
    header[:11] = b'InspectMesh'
    (out / name).write_bytes(header + struct.pack('<I', len(triangles)) + b''.join(triangles))

def facet(a, b, c):
    return struct.pack('<12fH', 0, 0, 0, *a, *b, *c, 0)

def reverse(record):
    changed = bytearray(record)
    changed[24:36], changed[36:48] = record[36:48], record[24:36]
    return bytes(changed)

cube = records(source)
write('inward-cube.stl', [reverse(record) for record in cube])
write('reversed-face-cube.stl', [reverse(record) if index < 2 else record for index, record in enumerate(cube)])
write('opposite-winding-duplicate-cube.stl', cube + [reverse(cube[0])])

sheet = [
    facet((0, 0, 0), (20, 0, 0), (20, 20, 0)),
    facet((0, 0, 0), (20, 20, 0), (0, 20, 0)),
]
write('horizontal-sheet.stl', sheet)
write('vertical-sheet.stl', [
    facet((0, 0, 0), (20, 0, 0), (20, 0, 20)),
    facet((0, 0, 0), (20, 0, 20), (0, 0, 20)),
])

plate = []
for record in cube:
    changed = bytearray(record)
    for vertex in range(3):
        offset = 12 + vertex * 12 + 8
        z = struct.unpack_from('<f', record, offset)[0]
        struct.pack_into('<f', changed, offset, z / 20)
    plate.append(bytes(changed))
write('closed-1-unit-plate.stl', plate)

divider = [
    facet((4, 4, 10), (16, 4, 10), (16, 16, 10)),
    facet((4, 4, 10), (16, 16, 10), (4, 16, 10)),
]
write('cube-with-internal-sheet.stl', cube + divider)
