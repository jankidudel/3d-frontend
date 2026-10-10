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
