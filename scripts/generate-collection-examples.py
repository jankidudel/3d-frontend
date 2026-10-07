"""Recreate original mathematical controls. No external models or physical tests."""
from pathlib import Path
import struct
import zipfile

OUT = Path(__file__).resolve().parents[1] / 'public/examples/collection-review'
OUT.mkdir(parents=True, exist_ok=True)
FACES = [0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5]

def box(x,y,z,dx,dy,dz):
    return [(x,y,z),(x+dx,y,z),(x+dx,y+dy,z),(x,y+dy,z),(x,y,z+dz),(x+dx,y,z+dz),(x+dx,y+dy,z+dz),(x,y+dy,z+dz)]

def stl(name, boxes):
    records=[]
    for vertices in boxes:
        for i in range(0,len(FACES),3):
            points=[vertices[j] for j in FACES[i:i+3]]
            records.append(struct.pack('<12fH',0,0,0,*sum((list(p) for p in points),[]),0))
    (OUT/name).write_bytes(b'InspectMesh owned collection control'.ljust(80,b'\0')+struct.pack('<I',len(records))+b''.join(records))

vertices=box(0,0,0,20,20,20)
for count in [1,2]:
    v=''.join(f'<vertex x="{x}" y="{y}" z="{z}"/>' for x,y,z in vertices)
    t=''.join(f'<triangle v1="{FACES[i]}" v2="{FACES[i+1]}" v3="{FACES[i+2]}"/>' for i in range(0,len(FACES),3))
    build=''.join(f'<item objectid="1" transform="1 0 0 0 1 0 0 0 1 {i*40} 0 0"/>' for i in range(count))
    model=f'<?xml version="1.0"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices>{v}</vertices><triangles>{t}</triangles></mesh></object></resources><build>{build}</build></model>'
    name='one-placed-cube.3mf' if count==1 else 'two-placed-cubes.3mf'
    with zipfile.ZipFile(OUT/name,'w',zipfile.ZIP_DEFLATED) as package:
        for path,data in {'3D/3dmodel.model':model,'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>','_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'}.items():
            info=zipfile.ZipInfo(path,date_time=(2026,10,7,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;package.writestr(info,data)
stl('overlapping-cubes.stl',[vertices,box(10,0,0,20,20,20)])
stl('detail-coupon.stl',[box(0,0,0,40,20,10),box(12,8,10,16,0.6,0.5)])
