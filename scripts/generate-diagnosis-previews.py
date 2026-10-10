from pathlib import Path
import struct,html
root=Path(__file__).resolve().parents[1] / 'public/examples'
def mesh(path):
 b=(root/path).read_bytes();n=struct.unpack_from('<I',b,80)[0];return [[struct.unpack_from('<fff',b,84+i*50+12+j*12) for j in range(3)] for i in range(n)]
def panel(path,x,caption,swap=False):
 tris=mesh(path)
 if swap: tris=[[(p[1],p[0],p[2]) for p in t] for t in tris]
 points=[p for t in tris for p in t];project=lambda p:(p[0]+p[1]*.35, -p[2]-p[1]*.25)
 xs,ys=zip(*map(project,points));scale=min(240/(max(xs)-min(xs)),135/(max(ys)-min(ys)));parts=[]
 for t in tris:
  coords=' '.join(f'{x+25+(project(p)[0]-min(xs))*scale:.2f},{35+(project(p)[1]-min(ys))*scale:.2f}' for p in t)
  parts.append(f'<polygon points="{coords}" fill="none" stroke="#165675" stroke-width="1.2"/>')
 return ''.join(parts)+f'<text x="{x+15}" y="205">{html.escape(caption)}</text>'
pairs={
 'units-scale':('english-market-batch/closed-20mm-cube.stl','english-market-batch/closed-20mm-cube.stl','20 coordinates','1.5× scale: 30'),
 'duplicate-winding':('cad-export/duplicate-face-cube.stl','diagnosis/reversed-winding-cube.stl','Duplicate facet','Reversed triangle'),
 'shells-intersections':('diagnosis/separated-cubes.stl','collection-review/overlapping-cubes.stl','Separate: 60 mm X','Crossing: 30 mm X'),
 'detail-loss':('collection-review/detail-coupon.stl','collection-review/detail-coupon-75.stl','Original: 24 triangles','Reduced: 18 triangles'),
 'fit-layout':('english-market-batch/printer-fit-250x210x180.stl','english-market-batch/printer-fit-250x210x180.stl','Original: X fails','Rotated: fits'),
}
for id,(a,b,ca,cb) in pairs.items():
 body=panel(a,10,ca)+panel(b,370,cb,id=='fit-layout')
 if id=='fit-layout':body+='<text x="25" y="246" font-size="16">Custom X/Y/Z box: 220 × 260 × 200 mm. Allowance is calculated separately.</text>'
 else:body+='<text x="25" y="246" font-size="16">Projected distributed geometry, panels independently fitted. No physical print test.</text>'
 (root/'diagnosis'/f'{id}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="720" height="260" viewBox="0 0 720 260"><rect width="720" height="260" rx="12" fill="#eef4f8"/><g font-family="sans-serif" font-size="26" fill="#173348">{body}</g></svg>')
# Reuse existing original diagrams with their real semantics.
for id,source in [('open-boundary','home/open-boundary.svg'),('build-conversion','collection-review/placed-items.svg')]:
 (root/'diagnosis'/f'{id}.svg').write_bytes((root/source).read_bytes())
(root/'diagnosis/thin-features.svg').write_text('''<svg xmlns="http://www.w3.org/2000/svg" width="720" height="260" viewBox="0 0 720 260"><rect width="720" height="260" fill="#eef4f8"/><g fill="#165675"><rect x="70" y="60" width="12" height="120"/><rect x="200" y="60" width="18" height="120"/><rect x="350" y="60" width="36" height="120"/></g><g font-family="sans-serif" fill="#173348" font-size="18"><text x="30" y="210">0.3 mm</text><text x="180" y="210">0.45 mm</text><text x="330" y="210">0.9 mm</text><text x="440" y="85">Three closed bars</text><text x="440" y="115">20 mm long, 10 mm high</text><text x="440" y="145">Widths exaggerated</text><text x="30" y="245">Measured thickness is distinct from the slicer’s chosen extrusion paths.</text></g></svg>''')
