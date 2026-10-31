import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { JSDOM } from 'jsdom';
import matter from 'gray-matter';
import { resolveGuideLinks } from './internal-guide-links.mts';
import { GuideSlug } from '../src/app/features/guides/generated/guide-slug.generated';
import { publicExamples } from '../src/app/features/examples/example-registry';
import { readStl } from '../src/app/features/stl-reducer/stl-reducer';
import { inspectMesh } from '../src/app/features/stl-print-preflight/stl-print-preflight-analysis';
import { parsePartStl } from '../src/app/features/stl-repair/disconnected-parts';
import { ExampleAsset } from '../src/app/features/examples/example-assets';
import {
  hashBytes,
  storedGeometry,
} from './generate-input-integrity-fixtures.mts';

const root = resolve(import.meta.dirname, '..');
const directory = resolve(root, 'public/examples/input-integrity');
const json = async (name: string) =>
  JSON.parse(await readFile(resolve(directory, name), 'utf8'));
const buffer = (bytes: Uint8Array) =>
  bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
const read = (path: string) => readFile(resolve(root, 'public' + path));
const refresh = process.env['INSPECTMESH_REFRESH_EVIDENCE'] === '1';

describe('input integrity evidence', () => {
  it('replays the exact public preflight reader, component reader and viewer-loader outcomes', async () => {
    const manifest = await json('manifest.json');
    const observations = [];
    for (const entry of [...manifest.entries, ...manifest.reused]) {
      const bytes = await read(entry.path);
      const fileName = entry.path.split('/').at(-1)!;
      let preflight;
      try {
        const mesh = await readStl(new File([bytes], fileName));
        preflight = {
          accepted: true,
          triangles: mesh.indices.length / 3,
          surfaceValidationRan: true,
          topology: inspectMesh(mesh),
        };
      } catch (error) {
        preflight = {
          accepted: false,
          surfaceValidationRan: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
      let components;
      try {
        const mesh = parsePartStl(buffer(bytes));
        components = {
          accepted: true,
          triangles: mesh.positions.length / 9,
          surfaceValidationRan: false,
          note: 'Reader only; component analysis was not run.',
        };
      } catch (error) {
        components = {
          accepted: false,
          surfaceValidationRan: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
      let viewerLoader;
      try {
        const geometry = new STLLoader().parse(buffer(bytes));
        const positions = geometry.getAttribute('position');
        viewerLoader = {
          returnedGeometry: true,
          triangles: positions.count / 3,
          nonempty: positions.count > 0,
          finiteCoordinates: Array.from(positions.array).every(Number.isFinite),
          surfaceValidationRan: false,
        };
        geometry.dispose();
      } catch (error) {
        viewerLoader = {
          returnedGeometry: false,
          surfaceValidationRan: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
      observations.push({
        path: entry.path,
        bytes: bytes.length,
        sha256: hashBytes(bytes),
        preflight,
        components,
        viewerLoader,
      });
    }
    const output = resolve(directory, 'observations.json');
    if (refresh) {
      const implementations = [];
      for (const file of [
        'src/app/features/stl-reducer/stl-reducer.ts',
        'src/app/features/stl-print-preflight/stl-print-preflight-analysis.ts',
        'src/app/features/stl-repair/disconnected-parts.ts',
        'node_modules/three/examples/jsm/loaders/STLLoader.js',
      ]) {
        implementations.push({
          file,
          sha256: hashBytes(await readFile(resolve(root, file))),
        });
      }
      await writeFile(
        output,
        JSON.stringify(
          {
            formatVersion: 1,
            observedDate: new Date().toISOString().slice(0, 10),
            sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], {
              cwd: root,
              encoding: 'utf8',
            }).trim(),
            node: process.version,
            threeVersion: '0.185.1',
            method:
              'Actual production functions executed locally in Vitest. Preflight: readStl -> inspectMesh. Component reader: parsePartStl only. Viewer: three STLLoader only, not the viewer UI or renderer. No deployed request or physical test.',
            reproduction:
              'INSPECTMESH_REFRESH_EVIDENCE=1 npx vitest run scripts/input-integrity.spec.mts',
            implementations,
            observations,
          },
          null,
          2,
        ) + '\n',
      );
    }
    expect((await json('observations.json')).observations).toEqual(
      observations,
    );
  });

  it('distinguishes a missing byte/count disagreement from a complete open surface', async () => {
    const observations = (await json('observations.json')).observations;
    for (const name of [
      'cube-last-byte-missing.stl',
      'cube-last-record-missing.stl',
      'cube-count-mismatch.stl',
      'triangle-cut-off-ascii.stl',
    ]) {
      const observed = observations.find((row: { path: string }) =>
        row.path.endsWith('/' + name),
      );
      expect(observed.preflight.accepted).toBe(false);
      expect(observed.preflight.surfaceValidationRan).toBe(false);
      expect(observed.components.accepted).toBe(false);
    }
    const open = observations.find((row: { path: string }) =>
      row.path.endsWith('/open-face-cube.stl'),
    );
    expect(open.bytes).toBe(584);
    expect(open.preflight.accepted).toBe(true);
    expect(open.preflight.topology.openEdges).toBe(4);
    expect(open.preflight.topology.volume).toBeNull();
    const solid = observations.find((row: { path: string }) =>
      row.path.endsWith('/cube-solid-header.stl'),
    );
    expect(solid.preflight.triangles).toBe(12);
    expect(solid.components.accepted).toBe(true);
  });

  it('keeps repeated/collinear zero area distinct from duplicates and nonzero Float32 area', async () => {
    const observations = (await json('observations.json')).observations;
    for (const name of ['cube-repeated-position.stl', 'cube-collinear.stl']) {
      const bytes = await read('/examples/input-integrity/' + name);
      const geometry = storedGeometry(bytes);
      expect(geometry.triangles).toHaveLength(13);
      expect(geometry.areas.at(-1)).toBe(0);
      expect(geometry.bounds).toEqual([
        [0, 20],
        [0, 20],
        [0, 20],
      ]);
      const observed = observations.find((row: { path: string }) =>
        row.path.endsWith('/' + name),
      );
      expect(observed.preflight.topology.degenerateTriangles).toBe(1);
      expect(observed.preflight.topology.duplicateTriangles).toBe(0);
    }
    const narrow = storedGeometry(
      await read('/examples/input-integrity/triangle-narrow.stl'),
    );
    expect(narrow.areas[0]).toBeGreaterThan(0);
    expect(narrow.areas[0]).toBeCloseTo(0.0000005, 13);
    const duplicate = observations.find((row: { path: string }) =>
      row.path.endsWith('/cad-export/duplicate-face-cube.stl'),
    );
    expect(duplicate.preflight.topology.duplicateTriangles).toBe(1);
    expect(duplicate.preflight.topology.degenerateTriangles).toBe(0);
  });

  it('preserves labelled vertex correspondence while reflection changes handedness and winding does not', async () => {
    const manifest = await json('manifest.json');
    const observations = (await json('observations.json')).observations;
    for (const [name, handedness, volume] of [
      ['tetra-reference.stl', 1, 1000],
      ['tetra-mirrored-outward.stl', -1, 1000],
      ['tetra-rotated-outward.stl', 1, 1000],
      ['tetra-inward.stl', 1, -1000],
    ] as const) {
      const entry = manifest.entries.find(
        (row: { name: string }) => row.name === name,
      );
      const [o, x, y, z] = entry.construction.transformedVertices as number[][];
      const [a, b, c] = [x, y, z].map((v) =>
        v.map((value, axis) => value - o[axis]),
      );
      const determinant =
        a[0] * (b[1] * c[2] - b[2] * c[1]) -
        a[1] * (b[0] * c[2] - b[2] * c[0]) +
        a[2] * (b[0] * c[1] - b[1] * c[0]);
      expect(Math.sign(determinant)).toBe(handedness);
      const actual = storedGeometry(await read(entry.path));
      expect(actual.signedVolume).toBe(volume);
      expect(actual.bounds).toEqual([
        [0, 30],
        [0, 20],
        [0, 10],
      ]);
      const observed = observations.find(
        (row: { path: string }) => row.path === entry.path,
      );
      expect(observed.preflight.topology.openEdges).toBe(0);
      expect(observed.preflight.topology.orientationConflicts).toBe(0);
      expect(observed.preflight.topology.volume).toBe(1000);
    }
    const reference = manifest.entries.find(
      (row: { name: string }) => row.name === 'tetra-reference.stl',
    ).construction.originalVertices as number[][];
    const edges = reference.flatMap((a, i) =>
      reference
        .slice(i + 1)
        .map((b) => a.reduce((sum, v, axis) => sum + (v - b[axis]) ** 2, 0)),
    );
    expect(new Set(edges).size).toBe(6);
  });

  it('resolves every published diagnostic asset and rechecks the manifest bytes and hashes', async () => {
    const manifest = await json('manifest.json');
    for (const entry of [...manifest.entries, ...manifest.reused]) {
      const bytes = await read(entry.path);
      expect(bytes.length).toBe(entry.bytes);
      expect(hashBytes(bytes)).toBe(entry.sha256);
      if (entry.format === 'binary-stl' && !entry.deliberateMalformedInput) {
        const count = new DataView(buffer(bytes)).getUint32(80, true);
        expect(bytes.length).toBe(84 + count * 50);
      }
    }
    for (const path of Object.values(ExampleAsset).filter((path) =>
      path.startsWith('/examples/input-integrity/'),
    )) {
      expect((await read(path)).length).toBeGreaterThan(0);
    }
  });
  it('retains complete processor observations and verifies the actual cleaned bytes against the reference surface', async () => {
    const recorded = await json('processor-observations.json');
    const manifest = await json('manifest.json');
    expect(recorded.processorRevision).toMatch(/^[a-f0-9]{40}$/);
    expect(recorded.harnessSha256).toBe(
      hashBytes(await readFile(resolve(root, recorded.harness))),
    );
    for (const input of recorded.capture.observations) {
      const entry = [...manifest.entries, ...manifest.reused].find(
        (entry: { path: string }) => entry.path === input.path,
      );
      expect(entry, input.path).toBeDefined();
      if (entry.deliberateMalformedInput) {
        expect(input.accepted).toBe(false);
        expect(input.surfaceValidationRan).toBe(false);
        expect(input.message).toMatch(/incomplete or malformed/);
      } else {
        expect(input.accepted).toBe(true);
        expect(input.surfaceValidationRan).toBe(true);
      }
    }
    const narrow = recorded.capture.observations.find(
      (entry: { path: string }) => entry.path.endsWith('/triangle-narrow.stl'),
    );
    expect(
      narrow.report.validation.issues.some(
        (issue: { code: string; count: number }) =>
          issue.code === 'degenerate_triangle' && issue.count === 1,
      ),
    ).toBe(true);
    const reference = storedGeometry(
      await read(ExampleAsset.Closed20mmCubeStl),
    );
    expect(recorded.capture.repairs).toHaveLength(2);
    for (const saved of recorded.capture.repairs) {
      const bytes = await read(saved.output);
      expect(bytes.length).toBe(saved.bytes);
      expect(hashBytes(bytes)).toBe(saved.sha256);
      expect(saved.report.before.triangleCount).toBe(13);
      expect(saved.report.degenerateTrianglesRemoved).toBe(1);
      expect(saved.report.duplicateTrianglesRemoved).toBe(0);
      expect(saved.report.orientationsCorrected).toBe(0);
      expect(saved.report.skippedReasons).toEqual([]);
      expect(saved.report.after.validation.isValid).toBe(true);
      expect(storedGeometry(bytes).triangles).toEqual(reference.triangles);
      const reopened = await readStl(new File([bytes], saved.output));
      expect(inspectMesh(reopened).volume).toBe(8000);
    }
    for (const diagram of manifest.diagrams) {
      const bytes = await read('/examples/input-integrity/' + diagram.name);
      expect(hashBytes(bytes)).toBe(diagram.sha256);
      expect(bytes.length).toBe(diagram.bytes);
    }
  });

  it('keeps two purposeful inbound links per new guide and excludes malformed bytes from gallery loading', async () => {
    for (const [target, sources] of [
      [
        GuideSlug.RouteDegenerateTrianglesStl,
        [
          'how-to-remove-duplicate-triangles-from-an-stl-file',
          'how-to-repair-an-stl-file',
        ],
      ],
      [
        GuideSlug.RouteTruncatedStlFile,
        ['ascii-vs-binary-stl', 'how-to-open-an-stl-file'],
      ],
      [
        GuideSlug.RouteMirroredStlFile,
        [
          'how-to-fix-flipped-normals-in-an-stl-file',
          'how-to-orient-an-stl-file-for-3d-printing',
        ],
      ],
    ] as const) {
      for (const source of sources) {
        const path = resolve(root, 'src/content/guides', source + '.html');
        const html = resolveGuideLinks(
          matter(await readFile(path, 'utf8')).content,
          GuideSlug,
          path,
        );
        const dom = new JSDOM(html);
        try {
          const link = dom.window.document.querySelector(
            `a[href="/${target}"]`,
          );
          expect(link?.textContent?.trim().length, source).toBeGreaterThan(12);
        } finally {
          dom.window.close();
        }
      }
    }
    const manifest = await json('manifest.json');
    const offered = new Set(
      publicExamples.flatMap((example) =>
        example.files.map((file) => file.path),
      ),
    );
    for (const entry of manifest.entries.filter(
      (entry: { deliberateMalformedInput: boolean }) =>
        entry.deliberateMalformedInput,
    )) {
      expect(offered.has(entry.path)).toBe(false);
    }
    for (const scenario of publicExamples.filter(
      (example) => example.group === 'Input integrity',
    )) {
      for (const file of scenario.files) {
        expect((await read(file.path)).length).toBe(file.bytes);
      }
    }
  });
});
