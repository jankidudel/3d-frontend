import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { analyseOverhangs } from '../overhang/overhang-analysis';
import {
  readThreeMfPackageInfo,
  resolveThreeMfWallGeometry,
} from './three-mf-wall-thickness';

function packageBuffer(modelXml: string): ArrayBuffer {
  const archive = zipSync({
    '[Content_Types].xml': strToU8(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    ),
    '_rels/.rels': strToU8(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Id="rel0"/></Relationships>',
    ),
    '3D/3dmodel.model': strToU8(modelXml),
  });
  return archive.buffer.slice(
    archive.byteOffset,
    archive.byteOffset + archive.byteLength,
  ) as ArrayBuffer;
}

describe('3MF package information', () => {
  it('reports an explicit unit and the placed build-item count', () => {
    const info = readThreeMfPackageInfo(
      packageBuffer(
        '<model unit="inch"><resources></resources><build><item objectid="1"/><item objectid="1"/></build></model>',
      ),
    );

    expect(info).toEqual({
      declaredUnit: 'inch',
      declaredUnitExplicitly: true,
      buildItemCount: 2,
      modelPartFound: true,
    });
  });

  it('uses the 3MF millimetre default only when the model omits the attribute', () => {
    const info = readThreeMfPackageInfo(
      packageBuffer(
        '<model><resources></resources><build><item objectid="1"/></build></model>',
      ),
    );

    expect(info.declaredUnit).toBe('millimeter');
    expect(info.declaredUnitExplicitly).toBe(false);
  });

  it('keeps a package without the conventional model-part path diagnosable', () => {
    const archive = zipSync({ 'notes.txt': strToU8('not a model') });
    const buffer = archive.buffer.slice(
      archive.byteOffset,
      archive.byteOffset + archive.byteLength,
    ) as ArrayBuffer;
    expect(readThreeMfPackageInfo(buffer)).toMatchObject({
      declaredUnit: 'millimeter',
      modelPartFound: false,
    });
  });

  it('applies a non-uniform placement before normal and area analysis', async () => {
    const resolved = await resolveThreeMfWallGeometry(
      packageBuffer(`
        <model xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" unit="millimeter">
          <resources>
            <object id="1" type="model">
              <mesh>
                <vertices>
                  <vertex x="0" y="0" z="0"/>
                  <vertex x="0" y="1" z="0"/>
                  <vertex x="1" y="0" z="1"/>
                </vertices>
                <triangles><triangle v1="0" v2="1" v3="2"/></triangles>
              </mesh>
            </object>
          </resources>
          <build><item objectid="1" transform="2 0 0 0 1 0 0 0 1 0 0 0"/></build>
        </model>
      `),
    );
    const report = analyseOverhangs(resolved.geometry, 50);

    expect(resolved.bounds.spans).toEqual([2, 1, 1]);
    expect(report?.flaggedCount).toBe(1);
    expect(report?.flaggedArea).toBeCloseTo(Math.sqrt(5) / 2);
  });
});
