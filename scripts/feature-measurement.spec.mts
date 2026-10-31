import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import {
  calculateMeasurement,
  MeasurementType,
  MeasurementFormat,
  SelectionBasis,
  createMeasurementEntry,
  type Point3,
} from '../src/app/features/shared/feature-measurement/measurement';
import { resolveThreeMfWallGeometry } from '../src/app/features/shared/wall-thickness/three-mf-wall-thickness';
import { inspectMesh } from '../src/app/features/stl-print-preflight/stl-print-preflight-analysis';
import { readStl } from '../src/app/features/stl-reducer/stl-reducer';
import { publicExamples } from '../src/app/features/examples/example-registry';
const dir = resolve(
  import.meta.dirname,
  '../public/examples/feature-measurement',
);
const json = async (name: string) =>
  JSON.parse(await readFile(resolve(dir, name), 'utf8'));
const arrayBuffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
afterEach(() => vi.unstubAllGlobals());
describe('feature measurement original controls and actual implementations', () => {
  it('verifies exact asset hashes, gallery file sizes and stored calculation observations', async () => {
    const manifest = await json('manifest.json');
    for (const asset of manifest.assets) {
      const bytes = await readFile(resolve(dir, asset.name));
      expect(bytes.length).toBe(asset.bytes);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        asset.sha256,
      );
    }
    for (const example of publicExamples.filter((e) =>
      e.id.startsWith('feature-'),
    )) {
      for (const file of example.files) {
        const bytes = await readFile(resolve(dir, file.name));
        expect(bytes.length).toBe(file.bytes);
      }
    }
    const observations = await json('observations.json');
    for (const key of ['angle', 'bore12', 'bore48', 'ellipseA', 'ellipseB']) {
      const result = calculateMeasurement(
        key === 'angle' ? MeasurementType.Angle : MeasurementType.Circle,
        observations[key].points,
      );
      expect(JSON.parse(JSON.stringify(result))).toEqual(
        observations[key].result,
      );
    }
    expect(observations.angle.result.angleDegrees).toBeCloseTo(
      60.0000012622552,
      12,
    );
    expect(observations.ellipseA.result.diameter).toBeCloseTo(25, 12);
    expect(observations.ellipseB.result.diameter).toBeCloseTo(12.5, 12);
  });
  it('independently reopens actual closed meshes and confirms matching bounds do not establish internal flat spans', async () => {
    for (const name of [
      'angle-coupon.stl',
      'angle-coupon-tilted.stl',
      'angle-coupon-scaled.stl',
      'distance-coupon.stl',
      'bore-12.stl',
      'bore-48.stl',
      'ellipse.stl',
    ]) {
      const bytes = await readFile(resolve(dir, name));
      const geometry = new STLLoader().parse(arrayBuffer(bytes));
      geometry.computeBoundingBox();
      const mesh = await readStl(new File([bytes], name));
      const report = inspectMesh(mesh);
      expect(report.openEdges).toBe(0);
      expect(report.nonManifoldEdges).toBe(0);
      if (name.startsWith('bore-')) {
        expect(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x).toBe(
          30,
        );
        expect(geometry.boundingBox!.max.y - geometry.boundingBox!.min.y).toBe(
          30,
        );
        expect(geometry.boundingBox!.max.z - geometry.boundingBox!.min.z).toBe(
          8,
        );
      }
    }
    const flat12 = 20 * Math.cos(Math.PI / 12),
      flat48 = 20 * Math.cos(Math.PI / 48);
    expect(flat12).toBeCloseTo(19.3185165258, 9);
    expect(flat48).toBeCloseTo(19.9571784648, 9);
    expect(flat12).toBeLessThan(flat48);
  });
  it('resolves real centimetre transforms and reused-item identity, restores display offset and measures build space', async () => {
    const dom = new JSDOM();
    vi.stubGlobal('DOMParser', dom.window.DOMParser);
    const bytes = await readFile(resolve(dir, 'placed-centimetre.3mf'));
    const resolved = await resolveThreeMfWallGeometry(arrayBuffer(bytes));
    expect(resolved.declaredUnit).toBe('centimeter');
    expect(resolved.items).toHaveLength(2);
    const a = Array.from(
      resolved.items[0].geometry.positions.slice(0, 3),
    ) as unknown as Point3;
    const b = Array.from(
      resolved.items[1].geometry.positions.slice(0, 3),
    ) as unknown as Point3;
    expect(a).toEqual([10, 20, 30]);
    expect(b).toEqual([50, 20, 30]);
    const entry = createMeasurementEntry(
      'cross-item',
      'Placement origins',
      MeasurementType.Distance,
      [
        {
          coordinates: a,
          basis: SelectionBasis.Vertex,
          placedItemId: resolved.items[0].id,
        },
        {
          coordinates: b,
          basis: SelectionBasis.Vertex,
          placedItemId: resolved.items[1].id,
        },
      ],
      {
        format: MeasurementFormat.ThreeMf,
        offset: [25, 30, 40],
        declaredUnit: resolved.declaredUnit,
      },
      'mm',
      'in',
    );
    expect(entry.result.distance).toBe(40);
    expect(entry.sourceUnit).toBe('centimeter');
    expect(entry.coordinateToMm).toBe(1);
    expect(entry.spansPlacedItems).toBe(true);
    expect(resolved.items[0].resourceId).toBe(resolved.items[1].resourceId);
    dom.window.close();
  });
});
