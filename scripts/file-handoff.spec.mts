import '@angular/compiler';
import { describe, expect, it, vi } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { unzipSync } from 'fflate';
import { resolveThreeMfWallGeometry } from '../src/app/features/shared/wall-thickness/three-mf-wall-thickness';
import { serializeThreeMfScope } from '../src/app/features/converters/three-mf-stl-export';
import { readStl } from '../src/app/features/stl-reducer/stl-reducer';
import {
  checkGeometry,
  ModelUnits,
} from '../src/app/features/repeat-workflows/mesh-workflows';

const root = resolve(import.meta.dirname, '../public/examples/file-handoff');
const refresh = process.env['INSPECTMESH_REFRESH_EVIDENCE'] === '1';
const hash = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
const textFile = (name: string) => readFile(resolve(root, name), 'utf8');

describe('receiving-file evidence', () => {
  it('checks the entire owned OBJ bundle, referenced assets, UV indices and closed outward geometry', async () => {
    const files = unzipSync(
      await readFile(resolve(root, 'obj-companion-bundle.zip')),
    );
    expect(Object.keys(files).sort()).toEqual([
      'README.md',
      'sample.mtl',
      'sample.obj',
      'textures/checker.png',
    ]);
    const manifest = JSON.parse(await textFile('assets.json'));
    for (const entry of manifest.bundleFiles) {
      expect(files[entry.name].length).toBe(entry.bytes);
      expect(hash(files[entry.name])).toBe(entry.sha256);
    }
    const obj = new TextDecoder().decode(files['sample.obj']);
    const mtl = new TextDecoder().decode(files['sample.mtl']);
    expect(obj.match(/^mtllib (.+)$/m)?.[1]).toBe('sample.mtl');
    expect(obj.match(/^usemtl (.+)$/m)?.[1]).toBe(
      mtl.match(/^newmtl (.+)$/m)?.[1],
    );
    const texturePath = mtl.match(/^map_Kd (.+)$/m)![1];
    expect(texturePath).toBe('textures/checker.png');
    const png = files[texturePath];
    expect(Array.from(png.slice(0, 8))).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(new DataView(png.buffer, png.byteOffset).getUint32(16)).toBe(16);
    expect(new DataView(png.buffer, png.byteOffset).getUint32(20)).toBe(16);
    const vertices = [...obj.matchAll(/^v (.+)$/gm)].map((match) =>
      match[1].split(' ').map(Number),
    );
    const uvs = [...obj.matchAll(/^vt (.+)$/gm)].map((match) =>
      match[1].split(' ').map(Number),
    );
    const faces = [...obj.matchAll(/^f (.+)$/gm)].map((match) =>
      match[1].split(' ').map((index) => index.split('/').map(Number)),
    );
    expect(vertices).toHaveLength(8);
    expect(faces).toHaveLength(6);
    expect(uvs).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    expect(
      [0, 1, 2].map((axis) => [
        Math.min(...vertices.map((v) => v[axis])),
        Math.max(...vertices.map((v) => v[axis])),
      ]),
    ).toEqual([
      [0, 20],
      [0, 10],
      [0, 5],
    ]);
    const edges = new Map<string, number[]>();
    let volume = 0;
    for (const face of faces) {
      expect(face).toHaveLength(4);
      face.forEach(([v, uv], index) => {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(vertices.length);
        expect(uv).toBeGreaterThanOrEqual(1);
        expect(uv).toBeLessThanOrEqual(uvs.length);
        const next = face[(index + 1) % 4][0];
        const key = [v, next].sort((a, b) => a - b).join(',');
        edges.set(key, [...(edges.get(key) ?? []), v < next ? 1 : -1]);
      });
      for (const i of [1, 2]) {
        const [a, b, c] = [face[0], face[i], face[i + 1]].map(
          ([v]) => vertices[v - 1],
        );
        volume +=
          (a[0] * (b[1] * c[2] - b[2] * c[1]) +
            a[1] * (b[2] * c[0] - b[0] * c[2]) +
            a[2] * (b[0] * c[1] - b[1] * c[0])) /
          6;
      }
    }
    expect(
      [...edges.values()].every(
        (uses) => uses.length === 2 && uses[0] + uses[1] === 0,
      ),
    ).toBe(true);
    expect(volume).toBeCloseTo(1000, 8);
    const csv = await textFile('receiving-check-blank.csv');
    const rows = csv.trimEnd().split(/\r?\n/).slice(1);
    expect(rows).toHaveLength(9);
    expect(
      rows.every((row) => row.endsWith(',') && row.split(',').length === 2),
    ).toBe(true);
  });

  it('runs the actual scoped serializer, reopens exact saved bytes and retains placed coordinates', async () => {
    const dom = new JSDOM();
    vi.stubGlobal('window', dom.window);
    vi.stubGlobal('DOMParser', dom.window.DOMParser);
    try {
      const source = await readFile(
        resolve(root, '../collection-review/two-placed-cubes.3mf'),
      );
      const resolved = await resolveThreeMfWallGeometry(
        source.buffer.slice(
          source.byteOffset,
          source.byteOffset + source.byteLength,
        ),
      );
      expect(resolved.declaredUnit).toBe('millimeter');
      expect(resolved.items.map((item) => item.id)).toEqual([
        'build-1',
        'build-2',
      ]);
      const outputs = [];
      for (const [name, itemId, triangles, minX] of [
        ['entire-build.stl', undefined, 24, 0],
        ['second-placement.stl', 'build-2', 12, 40],
      ] as const) {
        const result = await serializeThreeMfScope(resolved, source.length, {
          itemId,
          sourceName: 'two-placed-cubes.3mf',
        });
        expect(result.report.verification.passed).toBe(true);
        expect(result.report.reopenedTriangles).toBe(triangles);
        expect(result.report.reopenedBoundsMm).toEqual({
          min: [minX, 0, 0],
          max: [60, 20, 20],
          spans: [60 - minX, 20, 20],
        });
        expect(result.report.translationMm).toEqual([0, 0, 0]);
        const path = resolve(root, name);
        if (refresh) {
          await writeFile(path, result.bytes);
        }
        const saved = await readFile(path);
        expect(saved).toEqual(Buffer.from(result.bytes));
        const reopened = await readStl(new File([saved], name));
        expect(reopened.indices.length / 3).toBe(triangles);
        outputs.push({
          name,
          sha256: hash(saved),
          bytes: saved.length,
          report: result.report,
        });
      }
      const observation = {
        source: {
          name: 'two-placed-cubes.3mf',
          sha256: hash(source),
          bytes: source.length,
        },
        outputs,
      };
      const path = resolve(root, 'receiving-check-filled.json');
      if (refresh) {
        const implementations = [];
        for (const file of [
          'src/app/features/converters/three-mf-stl-export.ts',
          'src/app/features/shared/wall-thickness/three-mf-wall-thickness.ts',
          'src/app/features/stl-reducer/stl-reducer.ts',
        ]) {
          implementations.push({
            file,
            sha256: hash(await readFile(resolve(root, '../../..', file))),
          });
        }
        await writeFile(
          path,
          JSON.stringify(
            {
              observedDate: '2026-10-27',
              method:
                'InspectMesh local resolver -> serializeThreeMfScope -> exact saved STL reopened by readStl, in Vitest; application-internal derivative verification.',
              sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], {
                encoding: 'utf8',
              }).trim(),
              implementations,
              reproduction:
                'INSPECTMESH_REFRESH_EVIDENCE=1 npx vitest run scripts/file-handoff.spec.mts',
              externalReceiver: 'untested',
              appearance: 'untested',
              printerProfile: 'untested',
              observation,
              rights:
                'Original InspectMesh controls; CC0-1.0; no physical validation.',
            },
            null,
            2,
          ) + '\n',
        );
      }
      expect(
        JSON.parse(await textFile('receiving-check-filled.json')).observation,
      ).toEqual(observation);
    } finally {
      vi.unstubAllGlobals();
      dom.window.close();
    }
  });

  it('attributes local channel and missing-face results separately from analytical expectations', async () => {
    const observations = [];
    for (const [name, triangles, openEdges, volume] of [
      ['../english-market-batch/closed-20mm-cube.stl', 12, 0, 8000],
      ['../english-market-batch/open-face-cube.stl', 10, 4, null],
      ['../export-fidelity/square-hole-8mm.stl', 32, 0, 11360],
    ] as const) {
      const bytes = await readFile(resolve(root, name));
      const mesh = await readStl(new File([bytes], name));
      const result = checkGeometry(mesh, {
        stlUnit: ModelUnits.Millimetres,
        printer: null,
        thicknessThresholdMm: 1.2,
      });
      expect(mesh.indices.length / 3).toBe(triangles);
      expect(result.topology.openEdges).toBe(openEdges);
      if (volume === null) {
        expect(result.topology.volume).toBeNull();
      } else {
        expect(result.topology.volume).toBeCloseTo(volume, 8);
      }
      observations.push({
        name,
        sha256: hash(bytes),
        topology: result.topology,
      });
    }
    const path = resolve(root, 'interior-local-observation.json');
    if (refresh) {
      await writeFile(
        path,
        JSON.stringify(
          {
            observedDate: '2026-10-27',
            method:
              'Local readStl/checkGeometry functions in Vitest; not a browser or deployed endpoint.',
            sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], {
              encoding: 'utf8',
            }).trim(),
            methodSourceSha256: hash(
              await readFile(
                resolve(
                  root,
                  '../../../src/app/features/repeat-workflows/mesh-workflows.ts',
                ),
              ),
            ),
            observations,
          },
          null,
          2,
        ) + '\n',
      );
    }
    expect(
      JSON.parse(await textFile('interior-local-observation.json'))
        .observations,
    ).toEqual(observations);
  });
});
