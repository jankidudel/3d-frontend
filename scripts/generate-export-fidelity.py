"""Owned analytical controls, CC0-1.0. No CAD application or physical print execution."""
from pathlib import Path
import math
import struct

OUT = Path(__file__).resolve().parents[1] / 'public/examples/export-fidelity'
OUT.mkdir(parents=True, exist_ok=True)

def save(name, triangles):
    records = [struct.pack('<12fH', 0, 0, 0, *[v for p in t for v in p], 0) for t in triangles]
    (OUT/name).write_bytes(b'InspectMesh owned export fidelity control'.ljust(80, b'\0') + struct.pack('<I', len(records)) + b''.join(records))

def quad(triangles, a, b, c, d):
    triangles.extend([(a, b, c), (a, c, d)])

for width in [8, 6]:
    outer = [(0, 0), (40, 0), (40, 30), (0, 30)]
    lo_x, lo_y = 20-width/2, 15-width/2
    inner = [(lo_x, lo_y), (lo_x+width, lo_y), (lo_x+width, lo_y+width), (lo_x, lo_y+width)]
    bottom = [(*p, 0) for p in outer]
    top = [(*p, 10) for p in outer]
    inner_bottom = [(*p, 0) for p in inner]
    inner_top = [(*p, 10) for p in inner]
    triangles = []
    for i in range(4):
        n = (i+1) % 4
        quad(triangles, bottom[i], bottom[n], top[n], top[i])
        quad(triangles, inner_bottom[n], inner_bottom[i], inner_top[i], inner_top[n])
        quad(triangles, top[i], top[n], inner_top[n], inner_top[i])
        quad(triangles, bottom[n], bottom[i], inner_bottom[i], inner_bottom[n])
    save(f'square-hole-{width}mm.stl', triangles)

for segments in [24, 72]:
    bottom = [(10*math.cos(i*math.tau/segments), 10*math.sin(i*math.tau/segments), 0) for i in range(segments)]
    top = [(x, y, 20) for x, y, _ in bottom]
    triangles = []
    for i in range(segments):
        n = (i+1) % segments
        triangles.extend([((0, 0, 0), bottom[n], bottom[i]), ((0, 0, 20), top[i], top[n])])
        quad(triangles, bottom[i], bottom[n], top[n], top[i])
    save(f'circle-{segments}-segments.stl', triangles)

# Both panels share a scale. The opening is unambiguously visible from above.
(OUT/'changed-hole.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 390"><title>Same outer bounds, changed square opening</title><desc>Top views at the same scale. Both outer rectangles are 40 by 30 mm; the original opening is 8 by 8 and the revised opening is 6 by 6 mm. Z depth is 10 mm.</desc><rect width="760" height="390" fill="#f8fafc"/><g fill="#dbeafe" stroke="#075985" stroke-width="2"><path fill-rule="evenodd" d="M50 65h280v210H50z M162 142h56v56h-56z"/><path fill-rule="evenodd" d="M430 65h280v210H430z M549 149h42v42h-42z"/></g><g font-family="sans-serif" font-size="18" fill="#0f172a"><text x="50" y="35">Original: 8 mm square hole</text><text x="430" y="35">Revision: 6 mm square hole</text><text x="65" y="310">40 × 30 × 10 mm; 32 triangles</text><text x="445" y="310">40 × 30 × 10 mm; 32 triangles</text><text x="60" y="355">Top-view mathematical schematic at one scale; not a physical fit test.</text></g></svg>\n''')

def polygon(cx, n):
    return ' '.join(f'{cx+120*math.cos(i*math.tau/n):.7f},{165-120*math.sin(i*math.tau/n):.7f}' for i in range(n))
(OUT/'curve-segments.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 370"><title>24 and 72 facets against an ideal circle</title><desc>Two radius-10-mm polygon cross-sections at the same scale, with a separate dashed ideal circle. The true small gaps are not exaggerated.</desc><rect width="760" height="370" fill="#f8fafc"/><g fill="none" stroke="#475569" stroke-width="2" stroke-dasharray="5 4"><circle cx="190" cy="165" r="120"/><circle cx="570" cy="165" r="120"/></g><g fill="none" stroke="#075985" stroke-width="2"><polygon points="'''+polygon(190,24)+'''"/><polygon points="'''+polygon(570,72)+'''"/></g><g font-family="sans-serif" font-size="18" fill="#0f172a"><text x="60" y="25">24 segments; 96 triangles</text><text x="440" y="25">72 segments; 288 triangles</text><text x="55" y="315">Expected gap: 0.08555 mm</text><text x="440" y="315">Expected gap: 0.00952 mm</text><text x="35" y="355">One scale; dashed = ideal circle. Actual gaps, no exaggeration. No print test.</text></g></svg>\n''')
print('Generated four analytical STL controls and two source-based diagrams.')
