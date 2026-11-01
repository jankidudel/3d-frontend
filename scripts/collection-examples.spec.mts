import {
  analyseParts,
  closeLargestAreas,
  parsePartStl,
} from '../src/app/features/stl-repair/disconnected-parts.ts';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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
const slicerEvidenceRoot = resolve(
  import.meta.dirname,
  '../docs/english-market-batch/fixtures/slicer-diagnosis',
);
const file = async (path: string) =>
  new File([await readFile(resolve(root, path))], path.split('/').at(-1)!);
const gcode = async (name: string) =>
  (await readFile(resolve(slicerEvidenceRoot, name), 'utf8')).split('\n');
function layerEvidence(lines: readonly string[], layer: number) {
  let x = 0;
  let y = 0;
  let e = 0;
  let z = 0;
  let kind = '';
  let supportMoves = 0;
  let centreMoves = 0;
  for (const line of lines) {
    if (line.startsWith(';Z:')) {
      z = Number(line.slice(3));
      continue;
    }
    if (line.startsWith(';TYPE:')) {
      kind = line.slice(6);
      continue;
    }
    if (line.startsWith('G92 E')) {
      e = Number(line.slice(5).split(' ')[0]);
      continue;
    }
    if (!line.startsWith('G0 ') && !line.startsWith('G1 ')) {
      continue;
    }
    const values = Object.fromEntries(
      [...line.matchAll(/([XYE])(-?\d+(?:\.\d+)?)/g)].map((match) => [
        match[1],
        Number(match[2]),
      ]),
    );
    const nx = values['X'] ?? x;
    const ny = values['Y'] ?? y;
    const ne = values['E'] ?? e;
    if (Math.abs(z - layer) < 0.0001 && ne > e && kind !== 'Skirt/Brim') {
      if (kind.startsWith('Support')) {
        supportMoves++;
      } else {
        const dx = nx - x;
        const dy = ny - y;
        const lengthSquared = dx * dx + dy * dy;
        const t = lengthSquared
          ? Math.max(
              0,
              Math.min(1, ((100 - x) * dx + (100 - y) * dy) / lengthSquared),
            )
          : 0;
        if (Math.hypot(x + t * dx - 100, y + t * dy - 100) < 1) {
          centreMoves++;
        }
      }
    }
    x = nx;
    y = ny;
    e = ne;
  }
  return { supportMoves, centreMoves };
}
afterEach(() => vi.unstubAllGlobals());
describe('published owned geometry controls', () => {
  it('checks the published slicer controls against their independent source geometry', async () => {
    for (const [name, bytes, triangles, parts, min, max] of [
      ['integral-overhang.stl', 1084, 20, 1, [0, 0, 0], [30, 10, 20]],
      ['detached-tetrahedron.stl', 884, 16, 2, [0, 0, 0], [24, 10, 10]],
      ['two-intended-cubes.stl', 1284, 24, 2, [0, 0, 0], [30, 10, 10]],
      ['origin-cube.stl', 684, 12, 1, [0, 0, 0], [20, 20, 20]],
      ['shifted-cube.stl', 684, 12, 1, [230, 20, -5], [250, 40, 15]],
      ['open-through-channel.stl', 1684, 32, 1, [-10, -10, 0], [10, 10, 10]],
      ['capped-channel.stl', 684, 12, 1, [-10, -10, 0], [10, 10, 10]],
      ['overlapping-channel.stl', 2284, 44, 2, [-10, -10, 0], [10, 10, 10]],
    ] as const) {
      const sample = await file(`slicer-diagnosis/${name}`);
      const analysed = analyseParts(parsePartStl(await sample.arrayBuffer()));
      expect(sample.size).toBe(bytes);
      expect(analysed.triangles).toBe(triangles);
      expect(analysed.parts.length).toBe(parts);
      expect(analysed.bounds.min).toEqual(min);
      expect(analysed.bounds.max).toEqual(max);
    }
  });
  it('checks orientation and support controls against topology and area observations', async () => {
    for (const [name, bytes, triangles, dimensions] of [
      ['bridge-roof.stl', 2284, 44, [36, 10, 12]],
      ['cantilever-roof.stl', 1484, 28, [26, 10, 12]],
      ['straight-through-channel.stl', 3284, 64, [40, 20, 20]],
      ['narrow-access-cavity.stl', 14284, 284, [40, 30, 24]],
    ] as const) {
      const sample = await file(`orientation-support/${name}`);
      const mesh = await readStl(sample);
      const result = checkGeometry(mesh, settings);
      expect(sample.size).toBe(bytes);
      expect(mesh.indices.length / 3).toBe(triangles);
      expect(result.topology).toMatchObject({
        shells: 1,
        openEdges: 0,
        nonManifoldEdges: 0,
      });
      expect(Object.values(result.dimensionsMm)).toEqual(dimensions);
    }
    const bridge = analyseOverhangs(
      await readStl(await file('orientation-support/bridge-roof.stl')),
      45,
    )!;
    const cantilever = analyseOverhangs(
      await readStl(await file('orientation-support/cantilever-roof.stl')),
      45,
    )!;
    expect(bridge.flaggedArea).toBe(360);
    expect(cantilever.flaggedArea).toBe(260);
    expect(bridge.degenerateTriangleCount).toBe(0);
    expect(cantilever.degenerateTriangleCount).toBe(0);
  });
  it('recomputes support and clear-channel findings from retained slicer moves', async () => {
    const off = await gcode('integral-overhang-no-support.gcode');
    const on = await gcode('integral-overhang-support.gcode');
    expect(off[0]).toContain('PrusaSlicer 2.9.6');
    expect(layerEvidence(off, 5.2).supportMoves).toBe(0);
    expect(layerEvidence(on, 5.2).supportMoves).toBe(20);
    for (const [name, centre] of [
      ['open-through-channel.gcode', 0],
      ['capped-channel.gcode', 6],
      ['overlapping-channel.gcode', 6],
    ] as const) {
      expect(layerEvidence(await gcode(name), 0.2).centreMoves).toBe(centre);
    }
  });
  it('runs the channel and placement controls through local preflight geometry', async () => {
    for (const [name, shells] of [
      ['open-through-channel.stl', 1],
      ['capped-channel.stl', 1],
      ['overlapping-channel.stl', 2],
    ] as const) {
      const mesh = await readStl(await file(`slicer-diagnosis/${name}`));
      const result = checkGeometry(mesh, settings);
      expect(result.topology.openEdges).toBe(0);
      expect(result.topology.shells).toBe(shells);
      expect(result.dimensionsMm).toEqual({
        width: 20,
        height: 20,
        depth: 10,
      });
    }
    for (const name of ['origin-cube.stl', 'shifted-cube.stl']) {
      const mesh = await readStl(await file(`slicer-diagnosis/${name}`));
      expect(checkGeometry(mesh, settings).dimensionsMm).toEqual({
        width: 20,
        height: 20,
        depth: 20,
      });
    }
  });
  it('reopens the split and alignment controls with their published dimensions', async () => {
    const tube = checkGeometry(
      await readStl(await file('split-assembly/hollow-channel-20x20x20.stl')),
      settings,
    );
    expect(tube.dimensionsMm).toEqual({ width: 20, height: 20, depth: 20 });
    expect(tube.topology).toMatchObject({
      shells: 1,
      openEdges: 0,
      nonManifoldEdges: 0,
      volume: 5120,
    });
    for (const name of ['alignment-block-a.stl', 'alignment-block-b.stl']) {
      const block = checkGeometry(
        await readStl(await file(`split-assembly/${name}`)),
        settings,
      );
      expect(block.dimensionsMm).toEqual({
        width: 20,
        height: 20,
        depth: 10,
      });
      expect(block.topology).toMatchObject({
        shells: 1,
        openEdges: 0,
        nonManifoldEdges: 0,
      });
    }
    const dowel = checkGeometry(
      await readStl(await file('split-assembly/alignment-dowel.stl')),
      settings,
    );
    expect(dowel.dimensionsMm).toEqual({ width: 4, height: 4, depth: 12 });
    expect(dowel.topology.openEdges).toBe(0);
    const manifest = JSON.parse(
      await readFile(resolve(root, 'split-assembly/manifest.json'), 'utf8'),
    );
    expect(manifest.physicalTest).toBe(false);
    expect(manifest.coupon).toMatchObject({
      socketDiameter: 4.3,
      dowelDiameter: 4,
      socketDepth: 7,
    });
    const translations = manifest.coupon.assemblyTranslations;
    expect(translations.blockB[2] - 10).toBeCloseTo(0.2);
    expect(10 - translations.dowel[2]).toBeCloseTo(5.9);
    expect(translations.dowel[2] + 12 - translations.blockB[2]).toBeCloseTo(
      5.9,
    );
    for (const [name, endZ] of [
      ['alignment-block-a.stl', 3],
      ['alignment-block-b.stl', 7],
    ] as const) {
      const mesh = await readStl(await file(`split-assembly/${name}`));
      const socketPoints = Array.from(
        { length: mesh.positions.length / 3 },
        (_, index) =>
          Array.from(mesh.positions.slice(index * 3, index * 3 + 3)),
      ).filter(([x, y, z]) => z === endZ && Math.hypot(x - 10, y - 10) > 1);
      expect(socketPoints.length).toBeGreaterThanOrEqual(24);
      for (const [x, y] of socketPoints) {
        expect(Math.hypot(x - 10, y - 10)).toBeCloseTo(2.15, 5);
      }
    }
  });
  it('ties published split observations to exact re-imported input and output bytes', async () => {
    const evidence = JSON.parse(
      await readFile(resolve(root, 'split-assembly/observations.json'), 'utf8'),
    );
    expect(evidence.productionJob).toBe(false);
    expect(
      evidence.runs.map((run: { outcome: string }) => run.outcome),
    ).toEqual(['accepted', 'accepted', 'rejected', 'rejected']);
    for (const run of evidence.runs) {
      const input = await readFile(resolve(root, run.input));
      expect(createHash('sha256').update(input).digest('hex')).toBe(
        run.inputSha256,
      );
      for (const output of run.outputs ?? []) {
        const bytes = await readFile(
          resolve(root, 'split-assembly', output.path),
        );
        expect(createHash('sha256').update(bytes).digest('hex')).toBe(
          output.sha256,
        );
        const reopened = await readStl(new File([bytes], output.path));
        const check = checkGeometry(reopened, settings);
        expect(check.dimensionsMm).toEqual({
          width: 20,
          height: 20,
          depth: 10,
        });
        expect(check.topology.openEdges).toBe(0);
        expect(check.topology.volume).toBeCloseTo(4000, 5);
      }
    }
  });
  it('distinguishes source placement from the slicer-centred paths', async () => {
    expect(
      await readFile(resolve(slicerEvidenceRoot, 'origin-cube.gcode')),
    ).toEqual(
      await readFile(resolve(slicerEvidenceRoot, 'shifted-cube.gcode')),
    );
    expect(
      await readFile(resolve(slicerEvidenceRoot, 'capped-channel.gcode')),
    ).toEqual(
      await readFile(resolve(slicerEvidenceRoot, 'overlapping-channel.gcode')),
    );
    expect(
      await readFile(
        resolve(slicerEvidenceRoot, 'shifted-cube-no-arrange.txt'),
        'utf8',
      ),
    ).toContain('All objects are outside of the print volume.');
  });
  it('reparses the measured file-size examples and their actual byte counts', async () => {
    const ascii = await file(
      'floating-parts/cube-plus-two-fragments-ascii.stl',
    );
    const binary = await file(
      'floating-parts/cube-plus-two-fragments-binary.stl',
    );
    const original = await file('collection-review/detail-coupon.stl');
    const reduced = await file('collection-review/detail-coupon-75.stl');
    expect([ascii.size, binary.size, original.size, reduced.size]).toEqual([
      1868, 1084, 1284, 984,
    ]);
    for (const item of [ascii, binary]) {
      const parsed = parsePartStl(await item.arrayBuffer());
      const analysis = analyseParts(parsed);
      expect(analysis.triangles).toBe(20);
      expect(analysis.bounds).toMatchObject({
        min: [-8, 0, 0],
        max: [31, 20, 20],
      });
    }
    expect((await readStl(original)).indices.length / 3).toBe(24);
    expect((await readStl(reduced)).indices.length / 3).toBe(18);
  });
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
      publicExamples.filter(
        (example) =>
          example.group !== 'G-code evidence' &&
          example.group !== '3MF placements / export' &&
          example.group !== 'Slicer detail',
      ),
    ).toHaveLength(39);
    expect(new Set(publicExamples.map((example) => example.id)).size).toBe(
      publicExamples.length,
    );
    expect(
      findPublicExample(
        'https://customer.invalid/private.stl',
        '/tools/stl-viewer',
      ),
    ).toBeUndefined();
    expect(
      findPublicExample('build-conversion', '/tools/stl-viewer'),
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
  it('reopens the topology article controls and saved repair derivatives', async () => {
    for (const [
      path,
      triangles,
      openEdges,
      overShared,
      duplicates,
      conflicts,
    ] of [
      ['diagnosis/horizontal-sheet.stl', 2, 4, 0, 0, 0],
      ['diagnosis/vertical-sheet.stl', 2, 4, 0, 0, 0],
      ['diagnosis/closed-1-unit-plate.stl', 12, 0, 0, 0, 0],
      ['diagnosis/cube-with-internal-sheet.stl', 14, 4, 0, 0, 0],
      ['diagnosis/reversed-face-cube.stl', 12, 0, 0, 0, 4],
      ['diagnosis/inward-cube.stl', 12, 0, 0, 0, 0],
      ['diagnosis/opposite-winding-duplicate-cube.stl', 13, 0, 3, 1, 0],
      ['diagnosis/duplicate-cleaned-cube.stl', 12, 0, 0, 0, 0],
      ['diagnosis/opposite-duplicate-cleaned-cube.stl', 12, 0, 0, 0, 0],
      ['diagnosis/reversed-face-cleaned-cube.stl', 12, 0, 0, 0, 0],
    ] as const) {
      const mesh = await readStl(await file(path));
      expect(mesh.indices.length / 3, path).toBe(triangles);
      expect(inspectMesh(mesh), path).toMatchObject({
        openEdges,
        nonManifoldEdges: overShared,
        duplicateTriangles: duplicates,
        orientationConflicts: conflicts,
      });
    }
    const plate = inspectMesh(
      await readStl(await file('diagnosis/closed-1-unit-plate.stl')),
    );
    expect(plate.volume).toBeCloseTo(400);
    expect(
      inspectMesh(await readStl(await file('diagnosis/horizontal-sheet.stl')))
        .volume,
    ).toBeNull();
    expect(
      inspectMesh(
        await readStl(await file('diagnosis/cube-with-internal-sheet.stl')),
      ).volume,
    ).toBeNull();
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
  it('preserves measured and no-hit rays on the open-face wall control', async () => {
    const open = await readStl(
      await file('english-market-batch/open-face-cube.stl'),
    );
    const report = analyseWallThickness(
      open,
      1.2,
      WallThicknessUnit.Millimetres,
    );
    expect(report).toMatchObject({
      measured: 8,
      unmeasured: 2,
      belowThreshold: 0,
      threshold: 1.2,
    });
    expect(report?.minimum).toBeCloseTo(20, 2);
    expect(report?.samples.length).toBe(10);
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

import {
  resolveThreeMfWallGeometry,
  ThreeMfResolutionStatus,
} from '../src/app/features/shared/wall-thickness/three-mf-wall-thickness.ts';
import {
  analyseWallThickness,
  WallThicknessUnit,
} from '../src/app/features/shared/wall-thickness/wall-thickness-analysis.ts';
import { analyseOverhangs } from '../src/app/features/shared/overhang/overhang-analysis.ts';
import {
  convertThreeMfToStl,
  CoordinatePolicy,
  verifyStlGeometry,
} from '../src/app/features/converters/three-mf-stl-export.ts';
import { unzipSync, zipSync, strToU8 } from 'fflate';
const domForParts = () => {
  const dom = new JSDOM();
  vi.stubGlobal('DOMParser', dom.window.DOMParser);
  return dom;
};
describe('3MF identity, scope and exact derivative bytes', () => {
  it('applies translation and rotation before the 3MF overhang screen', async () => {
    const dom = domForParts();
    const translated = await resolveThreeMfWallGeometry(
      await (
        await file('orientation-support/translated-ramp.3mf')
      ).arrayBuffer(),
    );
    const rotated = await resolveThreeMfWallGeometry(
      await (await file('orientation-support/rotated-ramp.3mf')).arrayBuffer(),
    );
    const translatedReport = analyseOverhangs(translated.geometry, 45)!;
    const rotatedReport = analyseOverhangs(rotated.geometry, 45)!;
    expect(translated).toMatchObject({
      buildItemCount: 1,
      resolvedMeshCount: 1,
      declaredUnit: 'millimeter',
    });
    expect(rotated).toMatchObject({
      buildItemCount: 1,
      resolvedMeshCount: 1,
      declaredUnit: 'millimeter',
    });
    expect(translatedReport.flaggedArea).toBeCloseTo(200, 4);
    expect(rotatedReport.flaggedArea).toBeCloseTo(Math.hypot(20, 8) * 10, 4);
    expect(rotatedReport.flaggedArea).not.toBeCloseTo(
      translatedReport.flaggedArea,
      4,
    );
    dom.window.close();
  });
  it('resolves both placed wall scales before a combined-scene sampled screen', async () => {
    const dom = domForParts();
    const resolved = await resolveThreeMfWallGeometry(
      await (await file('wall-controls/two-scale-slabs.3mf')).arrayBuffer(),
    );
    const report = analyseWallThickness(
      resolved.geometry,
      0.6,
      WallThicknessUnit.Millimetres,
    );
    expect(resolved.buildItemCount).toBe(2);
    expect(resolved.resolvedMeshCount).toBe(2);
    expect(resolved.declaredUnit).toBe('millimeter');
    expect(resolved.items[0].bounds.spans[0]).toBeCloseTo(0.8, 5);
    expect(resolved.items[1].bounds.min[0]).toBe(30);
    expect(resolved.items[1].bounds.spans[0]).toBeCloseTo(0.4, 5);
    expect(report).not.toBeNull();
    expect(report).toMatchObject({
      measured: 24,
      unmeasured: 0,
      belowThreshold: 4,
      threshold: 0.6,
      unit: 'mm',
    });
    expect(report!.minimum).toBeCloseTo(0.4 - 0.00001, 5);
    expect(report!.samples.length).toBe(24);
    dom.window.close();
  });
  it('keeps repeated placements and unplaced resources distinct and exports the second placement deliberately', async () => {
    const dom = domForParts();
    const data = await (
      await file('part-inspection/unplaced-resource.3mf')
    ).arrayBuffer();
    const resolved = await resolveThreeMfWallGeometry(data);
    expect(resolved.storedObjectCount).toBe(2);
    expect(resolved.items.map((item) => item.id)).toEqual([
      'build-1',
      'build-2',
    ]);
    expect(resolved.bounds).toEqual({
      min: [0, 0, 0],
      max: [60, 20, 20],
      spans: [60, 20, 20],
    });
    const all = await convertThreeMfToStl(data);
    expect(all.report.reopenedTriangles).toBe(24);
    for (const policy of [CoordinatePolicy.Preserve, CoordinatePolicy.Origin]) {
      const result = await convertThreeMfToStl(data, {
        itemId: 'build-2',
        coordinatePolicy: policy,
      });
      expect(result.report.reopenedTriangles).toBe(12);
      expect(result.report.reopenedBoundsMm).toEqual({
        min: [policy === CoordinatePolicy.Preserve ? 40 : 0, 0, 0],
        max: [policy === CoordinatePolicy.Preserve ? 60 : 20, 20, 20],
        spans: [20, 20, 20],
      });
      expect(result.bytes.byteLength).toBe(684);
      expect(result.report.verification.passed).toBe(true);
      expect(result.report.translationMm).toEqual([
        policy === CoordinatePolicy.Origin ? -40 : 0,
        0,
        0,
      ]);
    }
    dom.window.close();
  });
  it('applies child rotation before parent translation, including selected composites', async () => {
    const dom = domForParts();
    const result = await convertThreeMfToStl(
      await (await file('part-inspection/nested-rotation.3mf')).arrayBuffer(),
      { itemId: 'build-1' },
    );
    expect(result.report.reopenedBoundsMm).toEqual({
      min: [20, 0, 0],
      max: [40, 10, 30],
      spans: [20, 10, 30],
    });
    expect(result.report.reopenedTriangles).toBe(12);
    dom.window.close();
  });
  it('converts declared-inch translation exactly once and compares actual Float32 coordinates', async () => {
    const dom = domForParts();
    const result = await convertThreeMfToStl(
      await (
        await file('english-market-batch/declared-inch-transformed.3mf')
      ).arrayBuffer(),
    );
    expect(result.report.reopenedBoundsMm.min).toEqual([
      Math.fround(50.8),
      0,
      0,
    ]);
    expect(result.report.reopenedBoundsMm.max).toEqual([
      Math.fround(76.2),
      Math.fround(25.4),
      Math.fround(25.4),
    ]);
    expect(result.report.reopenedTriangles).toBe(12);
    dom.window.close();
  });
  it('retains coincident multiplicity and reflected winding against independent cube surfaces', async () => {
    const dom = domForParts();
    const coincident = await convertThreeMfToStl(
      await (
        await file('part-inspection/coincident-placements.3mf')
      ).arrayBuffer(),
    );
    expect(coincident.report.placedItems.length).toBe(2);
    expect(coincident.report.reopenedTriangles).toBe(24);
    const reflected = await resolveThreeMfWallGeometry(
      await (await file('part-inspection/reflected-cube.3mf')).arrayBuffer(),
    );
    const cube = await readStl(
      await file('english-market-batch/closed-20mm-cube.stl'),
    );
    expect(reflected.bounds).toEqual({
      min: [0, 0, 0],
      max: [20, 20, 20],
      spans: [20, 20, 20],
    });
    // Independent orientation oracle: every face normal points away from (10,10,10).
    for (let face = 0; face < reflected.geometry.indices.length; face += 3) {
      const points = Array.from(
        reflected.geometry.indices.slice(face, face + 3),
        (index) =>
          Array.from(
            reflected.geometry.positions.slice(index * 3, index * 3 + 3),
          ),
      );
      const u = points[1].map((v, i) => v - points[0][i]);
      const v = points[2].map((n, i) => n - points[0][i]);
      const normal = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0],
      ];
      expect(
        normal.reduce((sum, n, axis) => sum + n * (points[0][axis] - 10), 0),
      ).toBeGreaterThan(0);
    }
    expect(reflected.geometry.indices.length).toBe(cube.indices.length);
    dom.window.close();
  });
  it('blocks unsupported namespaces independently of their prefix and never omits a bad item', async () => {
    const dom = domForParts();
    for (const name of ['required-extension', 'required-extension-alias']) {
      await expect(
        convertThreeMfToStl(
          await (await file(`part-inspection/${name}.3mf`)).arrayBuffer(),
        ),
      ).rejects.toMatchObject({ status: ThreeMfResolutionStatus.Unsupported });
    }
    for (const name of ['bad-reference', 'component-cycle']) {
      await expect(
        convertThreeMfToStl(
          await (await file(`part-inspection/${name}.3mf`)).arrayBuffer(),
        ),
      ).rejects.toMatchObject({ status: ThreeMfResolutionStatus.Invalid });
    }
    dom.window.close();
  });
  it('detects wrong scale, wrong translation and altered surfaces with unchanged count/bounds', async () => {
    const mesh = await readStl(
      await file('english-market-batch/closed-20mm-cube.stl'),
    );
    for (const changed of [
      mesh.positions.map((v) => v * 25.4),
      mesh.positions.map((v) => v + 40),
      mesh.positions.map((v, i) => (i === 3 ? v + 1 : v)),
    ]) {
      expect(verifyStlGeometry(mesh, { ...mesh, positions: changed })).toBe(
        false,
      );
    }
  });
  it('bounds nonfinite, deep, external and oversized inputs', async () => {
    const dom = domForParts();
    const original = unzipSync(
      new Uint8Array(
        await (await file('part-inspection/nested-rotation.3mf')).arrayBuffer(),
      ),
    );
    const originalXml = new TextDecoder().decode(original['Models/main.model']);
    for (const changed of [
      originalXml.replace('x="0"', 'x="NaN"'),
      originalXml.replace(
        '0 1 0 -1 0 0 0 0 1 0 0 0',
        '0 1 0 -1 0 0 0 0 1 Infinity 0 0',
      ),
    ]) {
      const bytes = zipSync({
        ...original,
        'Models/main.model': strToU8(changed),
      });
      await expect(
        resolveThreeMfWallGeometry(bytes.slice().buffer),
      ).rejects.toMatchObject({ status: ThreeMfResolutionStatus.Invalid });
    }
    const external = zipSync({
      ...original,
      '_rels/.rels': strToU8(
        '<Relationships><Relationship Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" Target="https://example.com/mesh.model" TargetMode="External"/></Relationships>',
      ),
    });
    await expect(
      resolveThreeMfWallGeometry(external.slice().buffer),
    ).rejects.toMatchObject({ status: ThreeMfResolutionStatus.Invalid });
    const oversized = zipSync({
      ...original,
      'padding.txt': new Uint8Array(21 * 1024 * 1024),
    });
    await expect(
      resolveThreeMfWallGeometry(oversized.slice().buffer),
    ).rejects.toMatchObject({ status: ThreeMfResolutionStatus.Limit });
    const chain = Array.from(
      { length: 70 },
      (_, i) =>
        `<object id="${i + 3}" type="model"><components><component objectid="${i + 2}"/></components></object>`,
    ).join('');
    const deep = zipSync({
      ...original,
      'Models/main.model': strToU8(
        originalXml
          .replace('</resources>', chain + '</resources>')
          .replace('<item objectid="2"', '<item objectid="72"'),
      ),
    });
    await expect(
      resolveThreeMfWallGeometry(deep.slice().buffer),
    ).rejects.toMatchObject({ status: ThreeMfResolutionStatus.Limit });
    dom.window.close();
  });
});

describe('reduction review controls', () => {
  it('checks independent ASCII/binary cube expectations and decimal representation', async () => {
    const { reviewedCandidate, ReductionMethod } =
      await import('../src/app/features/stl-reducer/candidate-review.ts');
    for (const name of ['cube-ascii.stl', 'cube-binary.stl']) {
      const input = await file(`reduction-review/${name}`);
      const originalBytes = new Uint8Array(await input.arrayBuffer());
      const original = await readStl(input);
      const output = await reviewedCandidate(
        original,
        ReductionMethod.Encoding,
        100,
      );
      expect(output.blob.size).toBe(684);
      expect(output.mesh.indices.length / 3).toBe(12);
      expect(output.bounds).toEqual({
        min: [0, 0, 0],
        max: [20, 20, 20],
        spans: [20, 20, 20],
      });
      expect(new Uint8Array(await input.arrayBuffer())).toEqual(originalBytes);
      if (name === 'cube-binary.stl') {
        expect(input.size - output.blob.size).toBe(0);
      }
    }
    const decimal = await readStl(
      await file('reduction-review/decimal-offset-ascii.stl'),
    );
    expect(decimal.maximumStorageError).toBeCloseTo(0.000000381469725141, 14);
    const output = await reviewedCandidate(
      decimal,
      ReductionMethod.Encoding,
      100,
    );
    expect(output.bounds.min[0]).toBe(0.10000000149011612);
    expect(output.bounds.max[0]).toBe(20.100000381469727);
  });
  it('reproduces actual ridge candidates and their two-way evidence with the pinned method', async () => {
    const { reviewedCandidate, ReductionMethod } =
      await import('../src/app/features/stl-reducer/candidate-review.ts');
    const { surfaceDifference } =
      await import('../src/app/features/repeat-workflows/mesh-workflows.ts');
    const original = await readStl(
      await file('collection-review/detail-coupon.stl'),
    );
    for (const [percent, actual, duplicateCount] of [
      [75, 18, 0],
      [50, 16, 2],
    ]) {
      const candidate = await reviewedCandidate(
        original,
        ReductionMethod.Reduction,
        percent,
      );
      expect(candidate.mesh.indices.length / 3).toBe(actual);
      expect(candidate.topology!.duplicateTriangles).toBe(duplicateCount);
      const result = surfaceDifference(original, candidate.mesh, 0.1);
      console.log(
        'Reproduced ridge',
        JSON.stringify({
          percent,
          requested: candidate.requestedTriangles,
          actual,
          bounds: candidate.bounds,
          topology: candidate.topology,
          regressions: candidate.regressions,
          maximum: result.maximumSampledMm,
          mean: result.meanSampledMm,
          exceedances: result.samplesOverTolerance,
        }),
      );
      if (percent === 75) {
        expect(result.maximumSampledMm).toBeCloseTo(0.2329, 4);
        expect(result.samplesOverTolerance).toBe(25);
      } else {
        expect(candidate.regressions).toContain('duplicateTriangles');
        expect(candidate.regressions).toContain('nonManifoldEdges');
      }
    }
  });
  it('preserves existing missing-face defects and exposes same bounds with removed narrow rib', async () => {
    const { reviewedCandidate, ReductionMethod } =
      await import('../src/app/features/stl-reducer/candidate-review.ts');
    const open = await readStl(
      await file('english-market-batch/open-face-cube.stl'),
    );
    const encoded = await reviewedCandidate(
      open,
      ReductionMethod.Encoding,
      100,
    );
    expect(encoded.originalTopology!.openEdges).toBe(4);
    expect(encoded.topology!.openEdges).toBe(4);
    expect(encoded.regressions).toEqual([]);
    const a = await readStl(
      await file('reduction-review/narrow-rib-original.stl'),
    );
    const b = await readStl(
      await file('reduction-review/narrow-rib-removed.stl'),
    );
    const { geometryBounds } =
      await import('../src/app/features/shared/wall-thickness/three-mf-wall-thickness.ts');
    expect(a.indices.length / 3).toBe(36);
    expect(b.indices.length / 3).toBe(24);
    expect(geometryBounds(a)).toEqual(geometryBounds(b));
    expect(geometryBounds(a).spans[2]).toBe(Math.fround(20.2));
  });
});

describe('registered disconnected-part controls', () => {
  it('matches the removal demonstration captions to actual generated ASCII and binary files', async () => {
    const example = findPublicExample(
      'floating-parts-removal',
      '/tools/stl-repair',
    )!;
    expect(example.files).toHaveLength(2);
    for (const asset of example.files) {
      const bytes = await readFile(
        resolve(root, asset.path.replace('/examples/', '')),
      );
      const result = analyseParts(parsePartStl(Uint8Array.from(bytes).buffer));
      expect(result.parts.map((part) => part.triangles)).toEqual([12, 4, 4]);
      expect(result.bounds).toMatchObject({
        min: [-8, 0, 0],
        max: [31, 20, 20],
      });
      expect(result.parts[0].area).toBe(2400);
    }
  });
  it('matches the intended-parts counterexample and close-area warning to its file', async () => {
    const example = findPublicExample(
      'floating-parts-intentional',
      '/tools/stl-repair',
    )!;
    const bytes = await readFile(
      resolve(root, example.files[0].path.replace('/examples/', '')),
    );
    const result = analyseParts(parsePartStl(Uint8Array.from(bytes).buffer));
    expect(result.parts.map((part) => part.area)).toEqual([2400, 2166]);
    expect(result.triangles).toBe(24);
    expect(closeLargestAreas(result)).toBe(true);
  });
});
