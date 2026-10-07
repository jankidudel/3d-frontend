import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import {
  readStl,
  simplify,
  writeBinaryStl,
} from '../src/app/features/stl-reducer/stl-reducer.ts';
import {
  checkGeometry,
  ModelUnits,
} from '../src/app/features/repeat-workflows/mesh-workflows.ts';
import { loadWorkflowModel } from '../src/app/features/repeat-workflows/load-model.ts';
const settings = {
  stlUnit: ModelUnits.Millimetres,
  printer: null,
  thicknessThresholdMm: 1.2,
};
const root = resolve(import.meta.dirname, '../public/examples');
const file = async (path: string) =>
  new File([await readFile(resolve(root, path))], path.split('/').at(-1)!);
afterEach(() => vi.unstubAllGlobals());
describe('published owned geometry controls', () => {
  it('resolves declared inches and transformed builds independently of the STL selector', async () => {
    const dom = new JSDOM();
    vi.stubGlobal('DOMParser', dom.window.DOMParser);
    const source = await file(
      'english-market-batch/declared-inch-transformed.3mf',
    );
    for (const unit of [ModelUnits.Millimetres, ModelUnits.Inches]) {
      const loaded = await loadWorkflowModel(source, unit);
      const result = checkGeometry(loaded.mesh, settings, loaded.scale);
      expect(result.dimensionsMm.width).toBeCloseTo(25.4, 4);
      const xs = Array.from(loaded.mesh.positions).filter(
        (_, i) => i % 3 === 0,
      );
      expect(Math.min(...xs)).toBeCloseTo(50.8, 4);
      expect(Math.max(...xs)).toBeCloseTo(76.2, 4);
    }
    dom.window.close();
  });
  it('distinguishes one resource from two placements and withholds multi-shell volume', async () => {
    const dom = new JSDOM();
    vi.stubGlobal('DOMParser', dom.window.DOMParser);
    for (const [name, width, shells] of [
      ['one-placed-cube.3mf', 20, 1],
      ['two-placed-cubes.3mf', 60, 2],
    ] as const) {
      const loaded = await loadWorkflowModel(
        await file(`collection-review/${name}`),
        ModelUnits.Inches,
      );
      const result = checkGeometry(loaded.mesh, settings, loaded.scale);
      expect(result.dimensionsMm.width).toBe(width);
      expect(result.topology.shells).toBe(shells);
      expect(result.topology.volume).toBe(shells === 1 ? 8000 : null);
    }
    dom.window.close();
  });
  it('demonstrates crossing shells with no over-shared edges', async () => {
    const mesh = await readStl(
      await file('collection-review/overlapping-cubes.stl'),
    );
    const result = checkGeometry(mesh, settings);
    expect(result.dimensionsMm.width).toBe(30);
    expect(result.topology.shells).toBe(2);
    expect(result.topology.openEdges).toBe(0);
    expect(result.topology.nonManifoldEdges).toBe(0);
    expect(result.topology.volume).toBeNull();
  });
  it('reproduces the reduced ridge control, including new findings at unchanged bounds', async () => {
    const original = await readStl(
      await file('collection-review/detail-coupon.stl'),
    );
    for (const [percent, triangles, duplicates, nonManifold] of [
      [75, 18, 0, 0],
      [50, 16, 2, 1],
    ] as const) {
      const generated = writeBinaryStl(await simplify(original, percent));
      const published = await file(
        `collection-review/detail-coupon-${percent}.stl`,
      );
      expect(new Uint8Array(await generated.arrayBuffer())).toEqual(
        new Uint8Array(await published.arrayBuffer()),
      );
      const mesh = await readStl(published);
      const result = checkGeometry(mesh, settings);
      expect(result.triangles).toBe(triangles);
      expect(result.dimensionsMm).toEqual({
        width: 40,
        height: 20,
        depth: 10.5,
      });
      expect(result.topology.duplicateTriangles).toBe(duplicates);
      expect(result.topology.nonManifoldEdges).toBe(nonManifold);
    }
  });
});
