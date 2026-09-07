import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { readThreeMfPackageInfo } from './three-mf-wall-thickness';

function packageBuffer(modelXml: string): ArrayBuffer {
  const archive = zipSync({ '3D/3dmodel.model': strToU8(modelXml) });
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

  it('rejects a package without a readable 3MF model part', () => {
    const archive = zipSync({ 'notes.txt': strToU8('not a model') });
    const buffer = archive.buffer.slice(
      archive.byteOffset,
      archive.byteOffset + archive.byteLength,
    ) as ArrayBuffer;
    expect(() => readThreeMfPackageInfo(buffer)).toThrow('invalid-package');
  });
});
