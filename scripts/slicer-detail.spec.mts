import '@angular/compiler';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { parseGcode } from '../src/app/features/gcode-preflight/gcode-parser';
import { resolveThreeMfWallGeometry } from '../src/app/features/shared/wall-thickness/three-mf-wall-thickness';
import { readStl } from '../src/app/features/stl-reducer/stl-reducer';
import { inspectMesh } from '../src/app/features/stl-print-preflight/stl-print-preflight-analysis';
import {
  analyseWallThickness,
  WallThicknessUnit,
} from '../src/app/features/shared/wall-thickness/wall-thickness-analysis';

const root = resolve(import.meta.dirname, '../docs/slicer-detail-evidence');
const publicRoot = resolve(root, '../../public/examples/slicer-detail');
const path = resolve(publicRoot, 'implementation-observations.json');

async function retainedOutput(name: string): Promise<Buffer> {
  const manifest = JSON.parse(
    await readFile(resolve(root, 'prusa-2.9.6/runs.json'), 'utf8'),
  );
  const entry = manifest.runs.find((run: { run: string }) => run.run === name);
  const file: string | undefined =
    entry?.output ?? manifest.project_outputs[name];
  if (!file) {
    throw new Error(`No retained output for ${name}`);
  }
  return readFile(resolve(root, file));
}
const refresh = process.env['INSPECTMESH_REFRESH_SLICER_EVIDENCE'] === '1';
const sha = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
const buffer = (bytes: Uint8Array) => new Uint8Array(bytes).buffer;

describe('slicer detail retained evidence', () => {
  it('reopens the exact projects and geometry derivative through current production implementations', async () => {
    const dom = new JSDOM('');
    const prior = globalThis.DOMParser;
    Object.defineProperty(globalThis, 'DOMParser', {
      configurable: true,
      value: dom.window.DOMParser,
    });
    const projects = [];
    try {
      for (const name of ['P-roof', 'P-open']) {
        const bytes = await readFile(
          resolve(root, '../../public/examples/slicer-detail', name + '.3mf'),
        );
        const model = await resolveThreeMfWallGeometry(buffer(bytes));
        expect(model.bounds.min).toEqual([85, 85, 0]);
        expect(model.bounds.max).toEqual([115, 115, 10]);
        expect(model.buildItemCount).toBe(1);
        expect(model.resolvedMeshCount).toBe(1);
        const topology = inspectMesh(model.geometry);
        projects.push({
          name,
          sha256: sha(bytes),
          status: model.status,
          buildItems: model.buildItemCount,
          meshes: model.resolvedMeshCount,
          triangles: model.geometry.indices.length / 3,
          bounds: model.bounds,
          topology,
        });
      }
    } finally {
      Object.defineProperty(globalThis, 'DOMParser', {
        configurable: true,
        value: prior,
      });
      dom.window.close();
    }
    const sourceBytes = await readFile(resolve(root, 'inputs/R-box.stl'));
    const derivativeBytes = await readFile(
      resolve(root, '../../public/examples/slicer-detail/P-open-geometry.stl'),
    );
    const source = await readStl(new File([sourceBytes], 'R-box.stl'));
    const derivative = await readStl(
      new File([derivativeBytes], 'P-open-geometry.stl'),
    );
    const records = (mesh: typeof source, translate = false) => {
      const triangles = [];
      for (let index = 0; index < mesh.indices.length; index += 3) {
        const vertices = Array.from({ length: 3 }, (_, corner) => {
          const vertex = mesh.indices[index + corner] * 3;
          return Array.from(
            { length: 3 },
            (_, axis) =>
              mesh.positions[vertex + axis] + (translate && axis < 2 ? 85 : 0),
          );
        });
        const cycles = [
          vertices,
          [vertices[1], vertices[2], vertices[0]],
          [vertices[2], vertices[0], vertices[1]],
        ];
        triangles.push(cycles.map((cycle) => JSON.stringify(cycle)).sort()[0]);
      }
      return triangles.sort();
    };
    // Export may preserve placement or return source-local coordinates; measure it.
    const placed =
      JSON.stringify(records(source, true)) ===
      JSON.stringify(records(derivative));
    const local =
      JSON.stringify(records(source)) === JSON.stringify(records(derivative));
    expect(placed || local).toBe(true);
    const observations = {
      projects,
      derivative: {
        sha256: sha(derivativeBytes),
        triangleRecordsMatch: true,
        sourceToDerivativeTranslation: placed ? [85, 85, 0] : [0, 0, 0],
        topology: inspectMesh(derivative),
      },
    };
    if (refresh) {
      await writeFile(path, JSON.stringify(observations, null, 2) + '\n');
    } else {
      const retained = JSON.parse(await readFile(path, 'utf8'));
      expect(observations).toEqual(retained);
    }
  });

  it('records exact-file per-metric G-code coverage and named material samples', async () => {
    const rows = [];
    for (const name of [
      'T1-C',
      'T2-C',
      'R1',
      'R2',
      'R3',
      'V1-S',
      'P-roof',
      'P-open',
      'P-fresh',
    ]) {
      const bytes = await retainedOutput(name);
      const report = parseGcode(bytes.toString());
      rows.push({
        run: name,
        sha256: sha(bytes),
        coverage: report.coverage,
        previewTruncated: report.previewTruncated,
        duration: report.duration,
        material: report.material,
        findings: report.findings.map((finding) => ({
          kind: finding.kind,
          firstLine: finding.firstLine,
          interpretation: finding.interpretation,
        })),
      });
    }
    const controls = [];
    for (const name of ['T1', 'T2']) {
      const bytes = await readFile(resolve(root, 'inputs', name + '.stl'));
      const mesh = await readStl(new File([bytes], name + '.stl'));
      const report = analyseWallThickness(
        mesh,
        0.4,
        WallThicknessUnit.Millimetres,
      )!;
      const namedSamples = report.samples.filter((sample) => {
        const indices = Array.from(
          mesh.indices.slice(sample.triangle * 3, sample.triangle * 3 + 3),
        );
        const centroid = Array.from(
          { length: 3 },
          (_, axis) =>
            indices.reduce(
              (sum, vertex) => sum + mesh.positions[vertex * 3 + axis],
              0,
            ) / 3,
        );
        return (
          centroid[0] >= 4 &&
          centroid[0] <= 4.81 &&
          centroid[1] > 7 &&
          centroid[1] < 17 &&
          centroid[2] > 2
        );
      });
      controls.push({
        control: name,
        sha256: sha(bytes),
        triangles: mesh.indices.length / 3,
        measured: report.measured,
        unmeasured: report.unmeasured,
        belowThreshold: report.belowThreshold,
        threshold: report.threshold,
        minimum: report.minimum,
        namedOLeftSamples: namedSamples,
      });
      expect(namedSamples.length).toBeGreaterThan(0);
    }
    const result = {
      runtime:
        'Current production implementations executed in Node; not a native display or browser screenshot',
      rows,
      controls,
    };
    const target = resolve(publicRoot, 'parser-observations.json');
    if (refresh) {
      await writeFile(target, JSON.stringify(result, null, 2) + '\n');
    } else {
      expect(result).toEqual(JSON.parse(await readFile(target, 'utf8')));
    }
  });
});

it('binds published controls, configuration and outputs to the actual retained runs', async () => {
  const manifest = JSON.parse(
    await readFile(resolve(root, 'prusa-2.9.6/runs.json'), 'utf8'),
  );
  const required = [
    'smoke-cube',
    'T1-C',
    'T1-A',
    'T2-C',
    'T3-C',
    'T3-F',
    'T4-C',
    'V1-N',
    'V1-S',
    'V2-N',
    'V2-S',
    'V3-S',
    'R1',
    'R2',
    'R3',
  ];
  expect(manifest.runs.map((run: { run: string }) => run.run)).toEqual(
    required,
  );
  for (const run of manifest.runs) {
    expect(run.exit_status).toBe(0);
    if (run.run === 'smoke-cube') {
      expect(run.output).toBeNull();
      expect(run.configuration).toBeNull();
      continue;
    }
    expect(run.output).toBe(
      '../../public/examples/slicer-detail/' + run.run + '.gcode',
    );
    expect(run.configuration).toBe(
      '../../public/examples/slicer-detail/' + run.run + '.ini',
    );
    const [output, config] = await Promise.all([
      readFile(resolve(root, run.output)),
      readFile(resolve(root, run.configuration)),
    ]);
    expect(sha(output)).toBe(run.output_sha256);
    expect(output.length).toBe(run.output_bytes);
    expect(sha(config)).toBe(run.configuration_sha256);
    expect(run.console_output).toContain('Slicing result exported');
  }
  const projectRecord = JSON.parse(
    await readFile(resolve(publicRoot, 'project-observations.json'), 'utf8'),
  );
  for (const project of projectRecord.projects) {
    expect(sha(await retainedOutput(project.project))).toBe(
      project.gcode_sha256,
    );
  }
  expect(sha(await retainedOutput('P-fresh'))).toBe(
    projectRecord.fresh_output_sha256,
  );

  const controls = JSON.parse(
    await readFile(resolve(root, 'inputs.json'), 'utf8'),
  );
  for (const input of controls.files) {
    const bytes = await readFile(resolve(root, input.file));
    expect(sha(bytes)).toBe(input.sha256);
    const published = await readFile(
      resolve(
        root,
        '../../public/examples/slicer-detail',
        input.file.split('/').at(-1),
      ),
    );
    expect(sha(published)).toBe(input.sha256);
  }
  const browser = JSON.parse(
    await readFile(resolve(publicRoot, 'browser-review-R1.json'), 'utf8'),
  );
  const bytes = await retainedOutput('R1');
  expect(browser.file.sha256).toBe(sha(bytes));
  const current = parseGcode(bytes.toString());
  expect(browser.report.coverage).toEqual(current.coverage);
  expect(browser.report.previewTruncated).toBe(false);
  expect(browser.report.counts.reviewedLines).toBe(
    browser.report.counts.totalLines,
  );
});
