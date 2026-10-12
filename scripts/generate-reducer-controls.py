"""Original mathematical controls and SVG explanations; never physical test claims."""
from pathlib import Path
import struct
import json
root = Path(__file__).resolve().parents[1]
out = root / 'public/examples/reduction-review'
out.mkdir(parents=True, exist_ok=True)
faces = [0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5]
def box(x,y,z,dx,dy,dz):
    return [(x,y,z),(x+dx,y,z),(x+dx,y+dy,z),(x,y+dy,z),(x,y,z+dz),(x+dx,y,z+dz),(x+dx,y+dy,z+dz),(x,y+dy,z+dz)]
def triangles(boxes):
    return [[vertices[j] for j in faces[i:i+3]] for vertices in boxes for i in range(0,len(faces),3)]
def binary(name, ts):
    records = [struct.pack('<12fH',0,0,0,*[c for p in t for c in p],0) for t in ts]
    (out/name).write_bytes(b'InspectMesh original reduction review control'.ljust(80,b'\0')+struct.pack('<I',len(ts))+b''.join(records))
def ascii_stl(name, ts):
    facets = ['facet normal 0 0 0\nouter loop\n'+'\n'.join('vertex '+' '.join(str(c) for c in p) for p in t)+'\nendloop\nendfacet' for t in ts]
    (out/name).write_text('solid control\n'+'\n'.join(facets)+'\nendsolid control\n')
cube=triangles([box(0,0,0,20,20,20)])
binary('cube-binary.stl',cube)
ascii_stl('cube-ascii.stl',cube)
binary('cube-shifted-x3.stl',triangles([box(3,0,0,20,20,20)]))
ascii_stl('decimal-offset-ascii.stl',triangles([box(.1,0,0,20,20,20)]))
body=box(0,0,0,20,20,20)
marker=box(1,1,20,2,2,.2)
tiny=box(9,9,20,2,.1,.2)
binary('narrow-rib-original.stl',triangles([body,marker,tiny]))
binary('narrow-rib-removed.stl',triangles([body,marker]))
# Independent Float32 representation evidence, derived through Python struct.
values=[20.0,0.1,20.1,1000000.1]
precision=[{'decimal':v,'reopenedFloat32':struct.unpack('<f',struct.pack('<f',v))[0],'absoluteDifference':abs(v-struct.unpack('<f',struct.pack('<f',v))[0])} for v in values]
(out/'float32-representation.json').write_text(json.dumps({'method':'Python struct little-endian IEEE754 float32; representation experiment, not metrology','values':precision},indent=2)+'\n')
# Mobile-readable diagrams: vertically arranged exact relationships at 720 x 600.
diagrams={
 'independent-branches':('One original, three independent candidates', [('Original bytes retained', 'Every branch starts here'),('Binary encoding','Triangle records; Float32 storage'),('Keep 75% request','Reopen actual output before review'),('Keep 50% request','Independent of the 75% result')]),
 'storage-surfaces':('Encoding and simplification answer different questions',[('Storage','12 triangles: binary = 84 + 50 × 12 = 684 bytes'),('Coordinates','20 is exact; decimal 0.1 rounds in Float32'),('Surfaces','Simplification may remove or reshape detail'),('Acceptance','Bytes and triangle counts do not certify features')]),
 'local-feature':('Equal outer bounds can hide a removed rib',[('Original','Body + marker + narrow rib: 36 triangles'),('Diagnostic revision','Body + marker: 24 triangles'),('Both outer boxes','20 × 20 × Float32(20.2) coordinates'),('Removed local feature','2 × 0.1 × 0.2 rib at (9, 9, 20)')]),
 'topology-regression':('Compare existing and increased findings',[('Original ridge control','24 triangles; two touching components'),('75% requested','Actual output is measured, never assumed'),('50% requested','Inspect duplicate and over-shared findings'),('Next action','Reject, retain original, try an independent gentler target')]),
 'display-storage':('Display rounding preserves stored decisions',[('Stored coordinate','25.39999771118164'),('Human display','25.4 mm'),('Boundary example','20.0000001 displays 20; still greater than 20'),('Tiny negative coordinate','-0.0000001 displays -1e-7, preserving its sign')]),
}
for name,(title,rows) in diagrams.items():
    parts=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 600"><title>{title}</title><rect width="720" height="600" fill="#f4f8fb"/><text x="32" y="44" font-size="25" font-family="sans-serif" fill="#123c55">{title}</text>']
    for i,(label,detail) in enumerate(rows):
        y=76+i*120
        parts.append(f'<rect x="24" y="{y}" width="672" height="100" rx="10" fill="white" stroke="#527589"/><text x="40" y="{y+32}" font-family="sans-serif" font-size="24" fill="#123c55">{label}</text><text x="40" y="{y+68}" font-family="sans-serif" font-size="20" fill="#123c55">{detail}</text>')
    parts.append('<text x="32" y="585" font-family="sans-serif" font-size="18" fill="#123c55">Original analytical schematic; no physical print test.</text></svg>')
    (out/f'{name}.svg').write_text(''.join(parts))
# Geometric close-up: plan views share scale and frame; feature is not exaggerated.
(out/'local-feature.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 600"><title>Equal bounds, missing narrow rib</title><rect width="720" height="600" fill="#f4f8fb"/><g font-family="sans-serif" fill="#123c55"><text x="24" y="38" font-size="26">Equal outer bounds; different local features</text><text x="24" y="74" font-size="22">Top views at one scale, 20 × 20 body</text><text x="28" y="112" font-size="23">Original: 36 triangles</text><text x="375" y="112" font-size="23">Revision: 24 triangles</text><rect x="28" y="134" width="280" height="280" fill="#d3e9ef" stroke="#123c55"/><rect x="375" y="134" width="280" height="280" fill="#d3e9ef" stroke="#123c55"/><rect x="42" y="372" width="28" height="28" fill="#087c9f"/><rect x="389" y="372" width="28" height="28" fill="#087c9f"/><rect x="154" y="286.6" width="28" height="1.4" fill="#ac3d22"/><circle cx="168" cy="287.3" r="24" fill="none" stroke="#ac3d22" stroke-width="2"/><path d="M168 311 L168 455 L28 455" fill="none" stroke="#ac3d22" stroke-width="2"/><text x="28" y="486" font-size="22">2 × 0.1 rib at (9, 9); height 0.2</text><text x="28" y="518" font-size="22">Marker stays; both Z spans are Float32(20.2)</text><text x="28" y="551" font-size="20">Hand-authored removal, not a simplifier output.</text><text x="28" y="582" font-size="20">Touching shells; no Boolean union or physical test.</text></g></svg>''')
# Diagram the dependency, not sequential reductions.
(out/'independent-branches.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 600"><title>Independent candidate branches from retained original</title><rect width="720" height="600" fill="#f4f8fb"/><g font-family="sans-serif" fill="#123c55"><text x="26" y="42" font-size="26">Retain one original; choose three derivatives</text><rect x="170" y="70" width="380" height="90" rx="12" fill="white" stroke="#123c55"/><text x="214" y="108" font-size="25">Original bytes + geometry</text><text x="225" y="139" font-size="20">Never overwritten by a candidate</text><path d="M360 160 L360 187 L72 187 L72 451 M72 226 L170 226 M72 342 L170 342 M72 451 L170 451" stroke="#087c9f" stroke-width="3" fill="none"/><rect x="170" y="195" width="510" height="88" rx="10" fill="white" stroke="#123c55"/><text x="194" y="231" font-size="25">Encoding candidate</text><text x="194" y="263" font-size="20">Triangle records under Float32 storage</text><rect x="170" y="308" width="510" height="88" rx="10" fill="white" stroke="#123c55"/><text x="194" y="344" font-size="25">75% kept-triangle request</text><text x="194" y="376" font-size="20">Measure actual serialized output</text><rect x="170" y="421" width="510" height="88" rx="10" fill="white" stroke="#123c55"/><text x="194" y="457" font-size="25">50% kept-triangle request</text><text x="194" y="489" font-size="20">Starts from original, not 75% output</text><text x="26" y="554" font-size="22">Select, inspect, compare, then download exact bytes.</text><text x="26" y="584" font-size="19">Analytical workflow diagram; no automatic best candidate.</text></g></svg>''')
