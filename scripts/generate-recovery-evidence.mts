import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import {
  readStl,
  simplify,
  writeBinaryStl,
  type StlMesh,
} from '../src/app/features/stl-reducer/stl-reducer.ts';

const directory = resolve(
  import.meta.dirname,
  '../public/examples/quality-evidence',
);
await mkdir(directory, { recursive: true });
const positions: number[] = [0, 0, 0, 0, 0, 10];
const indices: number[] = [];
const segments = 128;
// A closed extruded radial polygon: curved sides and one deliberately recessed key.
for (let index = 0; index < segments; index++) {
  const angle = (index * 2 * Math.PI) / segments;
  const radius = index >= 2 && index <= 5 ? 9 : 10;
  positions.push(radius * Math.cos(angle), radius * Math.sin(angle), 0);
  positions.push(radius * Math.cos(angle), radius * Math.sin(angle), 10);
}
for (let index = 0; index < segments; index++) {
  const bottom = 2 + index * 2;
  const top = bottom + 1;
  const next = 2 + ((index + 1) % segments) * 2;
  indices.push(
    0,
    next,
    bottom,
    1,
    top,
    next + 1,
    bottom,
    next,
    next + 1,
    bottom,
    next + 1,
    top,
  );
}
const source: StlMesh = {
  positions: new Float32Array(positions),
  indices: new Uint32Array(indices),
  encoding: 'binary STL',
};
const cases = [];
for (const kept of [100, 75, 50]) {
  const candidate = kept === 100 ? source : await simplify(source, kept);
  const bytes = new Uint8Array(await writeBinaryStl(candidate).arrayBuffer());
  const name = `keyed-cylinder-${kept}.stl`;
  await writeFile(resolve(directory, name), bytes);
  const reopened = await readStl(new File([bytes], name));
  const bounds = [0, 1, 2].map((axis) => {
    const values = Array.from(reopened.positions).filter(
      (_, index) => index % 3 === axis,
    );
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      span: Math.max(...values) - Math.min(...values),
    };
  });
  cases.push({
    name,
    requestedKeepPercent: kept,
    bytes: bytes.length,
    triangles: reopened.indices.length / 3,
    bounds,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
  const edges: string[] = [];
  for (let index = 0; index < reopened.indices.length; index += 3) {
    const points = Array.from(reopened.indices.slice(index, index + 3)).map(
      (vertex) =>
        `${35 + reopened.positions[vertex * 3] * 12},${180 - reopened.positions[vertex * 3 + 1] * 12}`,
    );
    edges.push(`<path d="M${points.join(' L')} Z"/>`);
  }
  // These are exact orthographic projections of serialized triangles, not screenshots.
  await writeFile(
    resolve(directory, `keyed-cylinder-${kept}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 0 330 370"><title>Actual ${cases.at(-1)!.triangles}-triangle export, top projection</title><rect x="-100" width="330" height="370" fill="#f8fafc"/><g fill="none" stroke="#075985" stroke-width="0.45">${edges.join('')}</g><g font-family="sans-serif" font-size="14" fill="#0f172a"><text x="-86" y="330">${kept}% request; ${cases.at(-1)!.triangles} actual triangles</text><text x="-86" y="353">One scale and frame; no physical test</text></g></svg>\n`,
  );
}
const inputs = [];
for (const relative of [
  'collection-review/one-placed-cube.3mf',
  'collection-review/two-placed-cubes.3mf',
  'cad-export/duplicate-face-cube.3mf',
]) {
  const bytes = await readFile(resolve(directory, '..', relative));
  inputs.push({
    path: '/examples/' + relative,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
await writeFile(
  resolve(directory, 'provenance.json'),
  JSON.stringify(
    {
      observedDate: '2026-10-24',
      rights:
        'New keyed-cylinder geometry and projections are original InspectMesh controls, dedicated to the public domain under CC0-1.0.',
      software: {
        node: process.version,
        meshoptimizer: '1.2.0',
        processor:
          'Local .NET Processor with corrected 3MF row-vector transform reader; see tools/RecoveryEvidence.',
      },
      reproduction: [
        'node --experimental-strip-types scripts/generate-recovery-evidence.mts',
        'From 3d-processor: dotnet run --project tools/RecoveryEvidence -- ../3d-frontend/public/examples',
      ],
      inputs,
      reductions: cases,
      scope:
        'Actual local software output from serialized and reopened files. Not a physical print, source-CAD accuracy claim, production-server observation or screenshot.',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  JSON.stringify(
    cases.map(({ name, triangles, bytes }) => ({ name, triangles, bytes })),
  ),
);
