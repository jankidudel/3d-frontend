import { strToU8, unzipSync, zipSync } from 'fflate';
import {
  analyseThreeMfForRepair,
  defaultRepairPlan,
  repairThreeMfLocally,
} from './three-mf-local-repair';

describe('browser-local 3MF repair', () => {
  it('removes duplicate and degenerate triangles while retaining unit, build and unrelated parts', async () => {
    const before = await analyseThreeMfForRepair(fixture());
    expect(before.counts).toMatchObject({
      triangles: 3,
      duplicateTriangles: 1,
      degenerateTriangles: 1,
    });
    expect(before.packageInfo).toMatchObject({
      declaredUnit: 'millimeter',
      buildItemCount: 2,
    });
    const repaired = await repairThreeMfLocally(
      before,
      defaultRepairPlan(before.counts),
    );
    expect(repaired.applied).toEqual({
      duplicateTriangles: 1,
      degenerateTriangles: 1,
      invalidIndexTriangles: 0,
    });
    expect(repaired.after.counts).toMatchObject({
      triangles: 1,
      duplicateTriangles: 0,
      degenerateTriangles: 0,
    });
    const parts = unzipSync(repaired.bytes);
    expect(new TextDecoder().decode(parts['Metadata/keep.txt'])).toBe(
      'retained',
    );
    expect(new TextDecoder().decode(parts['3D/3dmodel.model'])).toContain(
      '<item objectid="1" transform="1 0 0 0 1 0 0 0 1 2 0 0"',
    );
  });

  it('does not offer a no-op repair for a clean mesh', async () => {
    const before = await analyseThreeMfForRepair(
      fixture('<triangle v1="0" v2="1" v3="2"/>'),
    );
    expect(defaultRepairPlan(before.counts)).toEqual({
      removeDegenerateTriangles: false,
      removeDuplicateTriangles: false,
      removeInvalidIndexTriangles: false,
    });
  });

  it('refuses a package without the required model relationship', async () => {
    await expect(
      analyseThreeMfForRepair(
        zipSync({ '3D/3dmodel.model': strToU8('<model/>') }),
      ),
    ).rejects.toThrow('unsupported-package');
  });
});

function fixture(
  triangles = '<triangle v1="0" v2="1" v3="2"/><triangle v1="2" v2="1" v3="0"/><triangle v1="0" v2="0" v3="1"/>',
): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    ),
    '_rels/.rels': strToU8(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Id="rel0"/></Relationships>',
    ),
    'Metadata/keep.txt': strToU8('retained'),
    '3D/3dmodel.model': strToU8(
      `<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices><vertex x="0" y="0" z="0"/><vertex x="1" y="0" z="0"/><vertex x="0" y="1" z="0"/></vertices><triangles>${triangles}</triangles></mesh></object></resources><build><item objectid="1" transform="1 0 0 0 1 0 0 0 1 2 0 0"/><item objectid="1"/></build></model>`,
    ),
  });
}
