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

it('repairs the published duplicate package and exports declared units to millimetre STL', async () => {
  const dom = new JSDOM();
  vi.stubGlobal('DOMParser', dom.window.DOMParser);
  const { analyseThreeMfForRepair, repairThreeMfLocally } =
    await import('../src/app/features/three-mf/three-mf-local-repair.ts');
  const before = await analyseThreeMfForRepair(
    await (await file('cad-export/duplicate-face-cube.3mf')).arrayBuffer(),
  );
  expect(before.counts).toMatchObject({ triangles: 13, duplicateTriangles: 1 });
  const repaired = await repairThreeMfLocally(before, {
    removeDuplicateTriangles: true,
    removeDegenerateTriangles: false,
    removeInvalidIndexTriangles: false,
  });
  expect(repaired.after.counts).toMatchObject({
    triangles: 12,
    duplicateTriangles: 0,
    openEdges: 0,
  });
  const { convertThreeMfToStl } =
    await import('../src/app/features/converters/three-mf-stl-export.ts');
  for (const [name, width, triangles] of [
    ['one-placed-cube.3mf', 20, 12],
    ['two-placed-cubes.3mf', 60, 24],
  ] as const) {
    const output = await convertThreeMfToStl(
      await (await file(`collection-review/${name}`)).arrayBuffer(),
    );
    const reopened = await readStl(new File([output.bytes], 'reopened.stl'));
    expect(checkGeometry(reopened, settings).dimensionsMm.width).toBe(width);
    expect(reopened.indices.length / 3).toBe(triangles);
  }
  const converted = await convertThreeMfToStl(
    await (
      await file('english-market-batch/declared-inch-transformed.3mf')
    ).arrayBuffer(),
  );
  const mesh = await readStl(new File([converted.bytes], 'converted.stl'));
  const check = checkGeometry(mesh, settings);
  expect(check.dimensionsMm.width).toBeCloseTo(25.4, 4);
  expect(check.topology.volume).toBeCloseTo(16387.064, 1);
  const xs = Array.from(mesh.positions).filter((_, i) => i % 3 === 0);
  expect(Math.min(...xs)).toBeCloseTo(50.8, 4);
  expect(Math.max(...xs)).toBeCloseTo(76.2, 4);
  dom.window.close();
});

import {
  publicExamples,
  findPublicExample,
} from '../src/app/features/examples/example-registry.ts';
import { inspectMesh } from '../src/app/features/stl-print-preflight/stl-print-preflight-analysis.ts';
import { surfaceDifference } from '../src/app/features/repeat-workflows/mesh-workflows.ts';
import { scaleMesh } from '../src/app/features/stl-scale/stl-scale.ts';
import { assessPrinterOrientations } from '../src/app/shared/model-dimensions.ts';

describe('visual diagnosis teaching controls', () => {
  it('keeps unique registered scenarios, bounded bytes and allowlisted IDs', async () => {
    expect(
      publicExamples.filter((example) => example.group !== 'G-code evidence'),
    ).toHaveLength(8);
    expect(new Set(publicExamples.map((example) => example.id)).size).toBe(
      publicExamples.length,
    );
    expect(
      findPublicExample('https://customer.invalid/private.stl', '/stl-viewer'),
    ).toBeUndefined();
    expect(
      findPublicExample('build-conversion', '/stl-viewer'),
    ).toBeUndefined();
    for (const example of publicExamples) {
      for (const asset of example.files) {
        const bytes = await readFile(
          resolve(root, asset.path.replace('/examples/', '')),
        );
        expect(bytes.length).toBe(asset.bytes);
        expect(bytes.length).toBeLessThan(5 * 1024 * 1024);
      }
    }
  });
  it('distinguishes unit interpretation from scaling and reopens output', async () => {
    const original = await readStl(
      await file('english-market-batch/closed-20mm-cube.stl'),
    );
    expect(inspectMesh(original).volume).toBe(8000);
    expect(
      checkGeometry(original, settings, 25.4).dimensionsMm.width,
    ).toBeCloseTo(508, 4);
    const reopened = await readStl(
      new File([writeBinaryStl(scaleMesh(original, 1.5)!)], 'scaled.stl'),
    );
    expect(checkGeometry(reopened, settings).dimensionsMm.width).toBe(30);
    expect(inspectMesh(reopened).volume).toBe(27000);
    expect(reopened.indices.length).toBe(original.indices.length);
    expect(
      inspectMesh(
        await readStl(await file('english-market-batch/open-face-cube.stl')),
      ),
    ).toMatchObject({ openEdges: 4, volume: null });
  });
  it('independently varies duplicate facets, winding and stored normal vectors', async () => {
    for (const [path, triangles, duplicates, overShared, conflicts, volume] of [
      ['english-market-batch/closed-20mm-cube.stl', 12, 0, 0, 0, 8000],
      ['cad-export/duplicate-face-cube.stl', 13, 1, 3, 0, null],
      ['diagnosis/reversed-winding-cube.stl', 12, 0, 0, 3, null],
      ['diagnosis/stored-normal-cube.stl', 12, 0, 0, 0, 8000],
    ] as const) {
      const mesh = await readStl(await file(path));
      expect(mesh.indices.length / 3).toBe(triangles);
      expect(inspectMesh(mesh)).toMatchObject({
        duplicateTriangles: duplicates,
        nonManifoldEdges: overShared,
        orientationConflicts: conflicts,
        volume,
      });
    }
    const reversed = await readStl(
      await file('diagnosis/reversed-winding-cube.stl'),
    );
    const correctedIndices = reversed.indices.slice();
    [correctedIndices[1], correctedIndices[2]] = [
      correctedIndices[2],
      correctedIndices[1],
    ];
    const corrected = await readStl(
      new File(
        [writeBinaryStl({ ...reversed, indices: correctedIndices })],
        'corrected.stl',
      ),
    );
    expect(inspectMesh(corrected)).toMatchObject({
      orientationConflicts: 0,
      volume: 8000,
      openEdges: 0,
    });
    await expect(
      readStl(await file('diagnosis/malformed.stl')),
    ).rejects.toThrow();
  });
  it('withholds ambiguous multiple-shell volume, also across 3MF placements', async () => {
    for (const path of [
      'diagnosis/separated-cubes.stl',
      'collection-review/overlapping-cubes.stl',
    ]) {
      expect(inspectMesh(await readStl(await file(path)))).toMatchObject({
        shells: 2,
        openEdges: 0,
        nonManifoldEdges: 0,
        volume: null,
      });
    }
    const dom = new JSDOM();
    vi.stubGlobal('DOMParser', dom.window.DOMParser);
    const loaded = await loadWorkflowModel(
      await file('collection-review/two-placed-cubes.3mf'),
      ModelUnits.Millimetres,
    );
    expect(inspectMesh(loaded.mesh)).toMatchObject({
      shells: 2,
      openEdges: 0,
      volume: null,
    });
    dom.window.close();
  });
  it('runs finite comparison and wall sampling on distributed controls', async () => {
    const original = await readStl(
      await file('collection-review/detail-coupon.stl'),
    );
    const reduced = await readStl(
      await file('collection-review/detail-coupon-75.stl'),
    );
    const difference = surfaceDifference(original, reduced, 0.1);
    expect(difference.forward).toHaveLength(5000);
    expect(difference.reverse).toHaveLength(5000);
    expect(difference.maximumSampledMm).toBeGreaterThan(0);
    expect(difference.maximumSampledMm).toBeLessThan(1);
    const bars = checkGeometry(
      await readStl(await file('english-market-batch/thin-wall-bars.stl')),
      settings,
    );
    expect(bars.thickness?.measured).toBeGreaterThan(0);
    expect(bars.thickness?.belowThreshold).toBeGreaterThan(0);
    expect(difference.maximumSampledMm).toBeCloseTo(0.2329025659, 6);
    expect(difference.samplesOverTolerance).toBe(25);
    expect(bars.thickness).toMatchObject({
      samples: 36,
      measured: 36,
      unmeasured: 0,
      belowThreshold: 12,
    });
  });
  it('checks custom fit, hypothetical margins and curve arithmetic independently', async () => {
    const dimensions = checkGeometry(
      await readStl(
        await file('english-market-batch/printer-fit-250x210x180.stl'),
      ),
      settings,
    ).dimensionsMm;
    expect(dimensions).toEqual({ width: 250, height: 210, depth: 180 });
    const fit = assessPrinterOrientations(
      dimensions,
      'mm',
      { width: 220, height: 260, depth: 200 },
      'mm',
    );
    expect(fit?.current.fit.fits).toBe(false);
    expect(fit?.recommended?.fit.fits).toBe(true);
    const rotated = [210, 250, 180],
      box = [220, 260, 200];
    expect(
      rotated.map((n, i) => n + (i < 2 ? 10 : 0)).every((n, i) => n <= box[i]),
    ).toBe(true);
    expect(
      rotated.map((n, i) => n + (i < 2 ? 12 : 0)).every((n, i) => n <= box[i]),
    ).toBe(false);
    expect(10 * (1 - Math.cos(Math.PI / 24))).toBeCloseTo(0.08555, 5);
    expect(10 * (1 - Math.cos(Math.PI / 72))).toBeCloseTo(0.00952, 5);
  });
});

import { parseGcode } from '../src/app/features/gcode-preflight/gcode-parser.ts';
describe('distributed analytical G-code controls', () => {
  it('executes distributed byte fixtures with independent expected observations', async () => {
    const load = async (name: string) =>
      (
        await readFile(resolve(root, 'gcode-evidence', name + '.gcode'))
      ).toString();
    expect(parseGcode(await load('absolute-extrusion')).extrusionMoves).toBe(2);
    expect(parseGcode(await load('relative-extrusion')).extrusionMoves).toBe(3);
    expect(
      parseGcode(await load('shifted-location')).extrusionExtents?.min.x,
    ).toBe(230);
    const scopes = parseGcode(await load('travel-outside'));
    expect(scopes.extrusionExtents?.max.x).toBe(110);
    expect(scopes.extents?.max.x).toBe(230);
    expect(parseGcode(await load('unsupported-arc')).coverage.linear).toBe(
      'incomplete',
    );
    expect(parseGcode(await load('ambiguous-metadata')).material).toBeNull();
    expect(() => parseGcode('; analytical\nG21\nG1 XNaN')).toThrow('Line 3');
    expect(() => parseGcode('; comments only')).toThrow('No readable');
    const declared = parseGcode(await load('reviewed-estimates'));
    expect(declared.duration?.value).toBe(1.5);
    expect(declared.material?.value).toBe(12.5);
    for (const name of ['malformed-number', 'comments-only']) {
      const text = await load(name);
      expect(() => parseGcode(text)).toThrow();
    }
    for (const example of publicExamples.filter(
      (item) => item.group === 'G-code evidence',
    )) {
      expect(example.provenance).toContain('hand-authored');
      expect(example.limitations).toContain('Never execute');
    }
  });
});
