"""Owned rectangular fixtures. Run from the frontend root; no physical tests implied."""
from pathlib import Path
import struct
out=Path('public/examples/english-market-batch')
out.mkdir(parents=True, exist_ok=True)
faces=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5]
def box(x,y,z,offset=(0,0,0)):
    points=[(0,0,0),(x,0,0),(x,y,0),(0,y,0),(0,0,z),(x,0,z),(x,y,z),(0,y,z)]
    return [tuple(a+b for a,b in zip(p,offset)) for p in points]
def write(name, components):
    triangles=[]
    for points,indices in components:
        for i in range(0,len(indices),3):
            triangles.append([points[j] for j in indices[i:i+3]])
    with (out/name).open('wb') as f:
        f.write(b'InspectMesh owned illustrative fixture'.ljust(80,b'\0'))
        f.write(struct.pack('<I',len(triangles)))
        for tri in triangles:
            f.write(struct.pack('<12fH',0,0,0,*[v for p in tri for v in p],0))
write('closed-20mm-cube.stl',[(box(20,20,20),faces)])
write('open-face-cube.stl',[(box(20,20,20),faces[6:])])
write('changed-24mm-width.stl',[(box(24,20,20),faces)])
write('printer-fit-250x210x180.stl',[(box(250,210,180),faces)])
# Separate 0.3, 0.45 and 0.9 mm wide bars: a real slicer software experiment.
write('thin-wall-bars.stl',[(box(w,20,10,(i*10,0,0)),faces) for i,w in enumerate([.3,.45,.9])])

# Declared one-inch cube with an explicit two-inch build translation.
import zipfile
ns='http://schemas.microsoft.com/3dmanufacturing/core/2015/02'
verts=[(0,0,0),(1,0,0),(1,1,0),(0,1,0),(0,0,1),(1,0,1),(1,1,1),(0,1,1)]
faces=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5]
xml=f'<model xmlns="{ns}" unit="inch"><resources><object id="1" type="model"><mesh><vertices>'+''.join(f'<vertex x="{x}" y="{y}" z="{z}"/>' for x,y,z in verts)+'</vertices><triangles>'+''.join(f'<triangle v1="{faces[i]}" v2="{faces[i+1]}" v3="{faces[i+2]}"/>' for i in range(0,len(faces),3))+'</triangles></mesh></object></resources><build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 2 0 0"/></build></model>'
with zipfile.ZipFile(out/'declared-inch-transformed.3mf','w',zipfile.ZIP_DEFLATED) as z:
 z.writestr('3D/3dmodel.model',xml)
 z.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
 z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>')
