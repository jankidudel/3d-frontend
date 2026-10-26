import { describe, expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readStl } from '../src/app/features/stl-reducer/stl-reducer';
import {
  checkGeometry,
  ModelUnits,
  QueueState,
  surfaceDifference,
  WorkflowLimits,
} from '../src/app/features/repeat-workflows/mesh-workflows';
import {
  releaseExampleFiles,
  exampleFile,
  MeshExample,
} from '../src/app/features/repeat-workflows/example-meshes';
import {
  createCollectionReport,
  collectionCsv,
  collectionJson,
  type QueueEntry,
} from '../src/app/features/repeat-workflows/collection-report';
const root = resolve(import.meta.dirname, '../public/examples/export-fidelity');
const refresh = process.env['INSPECTMESH_REFRESH_EVIDENCE'] === '1';
const settings = {
  stlUnit: ModelUnits.Millimetres,
  printer: null,
  thicknessThresholdMm: 1.2,
};
const sha256 = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
const load = async (name: string) => {
  const bytes = await readFile(resolve(root, name));
  return { bytes, mesh: await readStl(new File([bytes], name)) };
};
// Independent coordinate-edge incidence and signed volume checks, separate from production topology.
function groundTruth(bytes: Uint8Array) {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = data.getUint32(80, true);
  expect(bytes.length).toBe(84 + count * 50);
  const edges = new Map<string, { uses: number; balance: number }>();
  const spans = [0, 1, 2].map(() => ({ min: Infinity, max: -Infinity }));
  let signedVolume = 0;
  for (let triangle = 0; triangle < count; triangle++) {
    const points = [0, 1, 2].map((point) =>
      [0, 1, 2].map((axis) =>
        data.getFloat32(84 + triangle * 50 + 12 + point * 12 + axis * 4, true),
      ),
    );
    for (const point of points) {
      point.forEach((value, axis) => {
        expect(Number.isFinite(value)).toBe(true);
        spans[axis].min = Math.min(spans[axis].min, value);
        spans[axis].max = Math.max(spans[axis].max, value);
      });
    }
    const [a, b, c] = points;
    signedVolume +=
      (a[0] * (b[1] * c[2] - b[2] * c[1]) +
        a[1] * (b[2] * c[0] - b[0] * c[2]) +
        a[2] * (b[0] * c[1] - b[1] * c[0])) /
      6;
    for (let i = 0; i < 3; i++) {
      const from = points[i].join(',');
      const to = points[(i + 1) % 3].join(',');
      const key = [from, to].sort().join('|');
      const value = edges.get(key) ?? { uses: 0, balance: 0 };
      value.uses++;
      value.balance += from < to ? 1 : -1;
      edges.set(key, value);
    }
  }
  expect(
    [...edges.values()].every((edge) => edge.uses === 2 && edge.balance === 0),
  ).toBe(true);
  expect(signedVolume).toBeGreaterThan(0);
  return { count, bounds: spans, signedVolume };
}
describe('owned export-fidelity evidence', () => {
  it('retains the existing unchanged and widened comparison controls as exact public downloads', async () => {
    for (const [kind, name] of [
      [MeshExample.Cube, 'baseline-original.stl'],
      [MeshExample.Retriangulated, 'baseline-retriangulated.stl'],
      [MeshExample.Changed, 'baseline-widened.stl'],
    ] as const) {
      const bytes = new Uint8Array(await exampleFile(kind).arrayBuffer());
      const path = resolve(root, name);
      if (refresh) {
        await writeFile(path, bytes);
      }
      expect(await readFile(path)).toEqual(Buffer.from(bytes));
    }
  });
  it('independently verifies equal-bounds changed-hole and source-curve controls, then captures actual comparison', async () => {
    const controls = [];
    const meshes = [];
    for (const width of [8, 6]) {
      const name = `square-hole-${width}mm.stl`;
      const { bytes, mesh } = await load(name);
      const truth = groundTruth(bytes);
      expect(truth.count).toBe(32);
      expect(truth.bounds).toEqual([
        { min: 0, max: 40 },
        { min: 0, max: 30 },
        { min: 0, max: 10 },
      ]);
      expect(truth.signedVolume).toBeCloseTo(width === 8 ? 11360 : 11640, 8);
      // Every wall corner exists at the independently specified opening coordinates.
      for (const x of [20 - width / 2, 20 + width / 2]) {
        for (const y of [15 - width / 2, 15 + width / 2]) {
          for (const z of [0, 10]) {
            expect(
              Array.from({ length: mesh.positions.length / 3 }, (_, i) =>
                Array.from(mesh.positions.slice(i * 3, i * 3 + 3)),
              ).some(
                (point) => point[0] === x && point[1] === y && point[2] === z,
              ),
            ).toBe(true);
          }
        }
      }
      const result = checkGeometry(mesh, settings);
      expect(result.topology.openEdges).toBe(0);
      expect(result.topology.orientationConflicts).toBe(0);
      expect(result.topology.volume).toBeCloseTo(truth.signedVolume, 8);
      controls.push({
        name,
        sha256: sha256(bytes),
        bytes: bytes.length,
        analytical: {
          holeWidthMm: width,
          triangles: 32,
          volumeMm3: width === 8 ? 11360 : 11640,
        },
        independentlyReopened: truth,
        localCheck: result,
      });
      meshes.push(mesh);
    }
    const difference = surfaceDifference(
      meshes[0],
      meshes[1],
      0.1,
      WorkflowLimits.CompareSamples,
    );
    expect(difference.forwardSummary.samples).toBe(5000);
    expect(difference.reverseSummary.samples).toBe(5000);
    expect(difference.samplesOverTolerance).toBeGreaterThan(0);
    // Observations are captured, never prescribed as a desired sampled maximum.
    const comparison = {
      units: 'mm',
      alignment: 'original coordinates',
      translationMm: [0, 0, 0],
      toleranceMm: 0.1,
      samplesPerDirection: difference.samplesPerDirection,
      forward: difference.forwardSummary,
      reverse: difference.reverseSummary,
      maximumSampledMm: difference.maximumSampledMm,
      meanSampledMm: difference.meanSampledMm,
      samplesOverTolerance: difference.samplesOverTolerance,
      limitation:
        'Finite area-distributed point-to-triangle samples; not a whole-surface bound or automatic hole recognition.',
    };
    const curves = [];
    for (const segments of [24, 72]) {
      const name = `circle-${segments}-segments.stl`;
      const { bytes, mesh } = await load(name);
      const truth = groundTruth(bytes);
      expect(truth.count).toBe(segments * 4);
      expect(bytes.length).toBe(segments === 24 ? 4884 : 14484);
      expect(truth.bounds).toEqual([
        { min: -10, max: 10 },
        { min: -10, max: 10 },
        { min: 0, max: 20 },
      ]);
      const expectedVolume =
        ((segments * 100 * Math.sin((2 * Math.PI) / segments)) / 2) * 20;
      expect(truth.signedVolume).toBeCloseTo(expectedVolume, 2);
      const sagitta = 10 * (1 - Math.cos(Math.PI / segments));
      expect(sagitta).toBeCloseTo(
        segments === 24 ? 0.0855513862619 : 0.00951778418142,
        10,
      );
      curves.push({
        name,
        sha256: sha256(bytes),
        bytes: bytes.length,
        segments,
        analytical: {
          radiusMm: 10,
          heightMm: 20,
          sagittaMm: sagitta,
          volumeMm3: expectedVolume,
        },
        independentlyReopened: truth,
        localCheck: checkGeometry(mesh, settings),
      });
    }
    const observed = {
      method:
        'Existing local parser/checkGeometry and bidirectional surfaceDifference; independent binary edge incidence and signed-volume checks.',
      observedDate: '2026-10-26',
      toolRoutes: ['/stl-compare', '/stl-viewer'],
      captureCommand:
        'INSPECTMESH_REFRESH_EVIDENCE=1 npx vitest run scripts/export-fidelity.spec.mts',
      executionPath:
        'Local functions in Vitest; not browser UI, deployed server, CAD export or physical print.',
      sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim(),
      controls,
      comparison,
      curves,
    };
    const path = resolve(root, 'observations.json');
    if (refresh) {
      const implementations = [];
      for (const source of [
        'src/app/features/repeat-workflows/mesh-workflows.ts',
        'src/app/features/stl-reducer/stl-reducer.ts',
        'src/app/features/stl-print-preflight/stl-print-preflight-analysis.ts',
      ]) {
        implementations.push({
          source,
          sha256: sha256(await readFile(resolve(root, '../../..', source))),
        });
      }
      await writeFile(
        path,
        JSON.stringify(
          {
            ...observed,
            implementations,
            rights:
              'Original InspectMesh mathematical controls and diagrams, CC0-1.0. No physical validation.',
          },
          null,
          2,
        ) + '\n',
      );
    }
    const retained = JSON.parse(await readFile(path, 'utf8'));
    expect(retained.controls).toEqual(controls);
    expect(retained.comparison).toEqual(comparison);
    expect(retained.curves).toEqual(curves);
  });
  it('captures the existing generated three-file kit and actual collection export formats without clearing the cover finding', async () => {
    const retainedReport = refresh
      ? null
      : JSON.parse(
          await readFile(resolve(root, 'kit-collection-report.json'), 'utf8'),
        );
    const rows: QueueEntry[] = [];
    const inventory = [];
    for (const [index, source] of releaseExampleFiles().entries()) {
      const started = performance.now();
      const bytes = new Uint8Array(await source.arrayBuffer());
      const mesh = await readStl(new File([bytes], source.name));
      const result = checkGeometry(mesh, settings);
      rows.push({
        id: index + 1,
        name: source.name,
        state: QueueState.Complete,
        error: '',
        result,
        unit: 'mm',
        warnings: [],
        durationMs: refresh
          ? performance.now() - started
          : retainedReport.files[index].durationMs,
      });
      inventory.push({
        file: source.name,
        revision: 'r01',
        quantity: 1,
        bytes: bytes.length,
        sha256: sha256(bytes),
        spansXyzMm: Object.values(result.dimensionsMm),
        topology: result.topology,
      });
      const path = resolve(root, source.name);
      if (refresh) {
        await writeFile(path, bytes);
      }
      expect(await readFile(path)).toEqual(Buffer.from(bytes));
    }
    expect(inventory.map((row) => row.spansXyzMm)).toEqual([
      [60, 40, 4],
      [60, 40, 2],
      [8, 8, 12],
    ]);
    expect(rows[0].result!.topology.volume).toBe(9600);
    expect(rows[1].result!.topology.openEdges).toBe(4);
    expect(rows[1].result!.topology.volume).toBeNull();
    expect(rows[2].result!.topology.volume).toBe(768);
    const report = createCollectionReport(
      rows,
      settings,
      '2026-10-26',
      'Generated kit r01 - unresolved cover',
    );
    expect(
      report.files[1].findings.some((finding) => finding.status === 'review'),
    ).toBe(true);
    expect(
      report.files.every((row) =>
        row.findings.some((finding) => finding.status === 'skipped'),
      ),
    ).toBe(true);
    const csv = collectionCsv(report);
    const json = collectionJson(report);
    for (const [name, content] of [
      ['kit-collection-report.json', json],
      ['kit-collection-report.csv', csv],
    ] as const) {
      const path = resolve(root, name);
      if (refresh) {
        await writeFile(path, content + '\n');
      }
      // Git can normalise the retained CSV to LF on checkout; the exporter uses CRLF.
      // Compare the complete contents without treating record separators as a finding change.
      const retained = (await readFile(path, 'utf8'))
        .replaceAll('\r\n', '\n')
        .trim();
      expect(retained).toBe(content.replaceAll('\r\n', '\n').trim());
    }
    const release = {
      release: 'generated-box-controls-r01',
      preparedBy: null,
      observedDate: '2026-10-26',
      classification:
        'Generated box geometry, not a mechanically fitted enclosure or a ready-to-sell kit.',
      coordinateAssumption: 'millimetres; STL has no unit declaration',
      intendedInventory: inventory,
      checks: {
        tool: '/batch-stl-checker',
        methodVersion: report.methodVersion,
        executionPath:
          'Actual existing collection functions in Vitest, not browser/deployed execution.',
        settings,
        report: '/examples/export-fidelity/kit-collection-report.json',
        csv: '/examples/export-fidelity/kit-collection-report.csv',
      },
      manualInventoryExample:
        'Selecting only base and cover omits the intended spacer. The remaining per-file results do not detect that omission automatically.',
      changesSincePriorRelease: null,
      slicerReview: null,
      physicalTesting: null,
      releaseDecision:
        'Hold unconditional release: the deliberately open-face cover has four boundary edges and unavailable volume. Review intended geometry and re-export from source; slicer/physical checks have not run.',
      unresolvedOwner:
        'Source model author/operator; no real operator identity assigned.',
    };
    const path = resolve(root, 'kit-release-record.json');
    if (refresh) {
      await writeFile(path, JSON.stringify(release, null, 2) + '\n');
    }
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(release);
  });
});
