import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  asciiFixture,
  binaryFixture,
  cubeTriangles,
  demoTriangles,
} from '../src/app/features/stl-repair/parts-fixtures.ts';
const fixtures = {
  'one-cube': cubeTriangles(),
  'cube-plus-two-fragments': demoTriangles(),
  'two-intended-parts': [
    ...cubeTriangles(20),
    ...cubeTriangles(19, [30, 0, 0]),
  ],
  'point-touching-cubes': [
    ...cubeTriangles(20),
    ...cubeTriangles(10, [20, 20, 20]),
  ],
  'nearby-gap': [...cubeTriangles(20), ...cubeTriangles(10, [20.001, 0, 0])],
  'outer-and-cavity-shell': [
    ...cubeTriangles(20),
    ...cubeTriangles(10, [5, 5, 5])
      .reduce<number[][]>((faces, value, index, values) => {
        if (index % 9 === 0) {
          faces.push([
            ...values.slice(index, index + 3),
            ...values.slice(index + 6, index + 9),
            ...values.slice(index + 3, index + 6),
          ]);
        }
        return faces;
      }, [])
      .flat(),
  ],
  'open-cube': cubeTriangles().slice(18),
  'non-manifold-cube': [...cubeTriangles(), ...cubeTriangles().slice(0, 9)],
  'degenerate-face': [...cubeTriangles(), 0, 0, 0, 0, 0, 0, 1, 0, 0],
  'many-pieces': Array.from({ length: 1000 }, (_, index) =>
    cubeTriangles(1, [(index % 100) * 3, Math.floor(index / 100) * 3, 0]),
  ).flat(),
};
for (const target of [
  '../../test-fixtures/stl/floating-parts/',
  '../public/examples/floating-parts/',
]) {
  const root = fileURLToPath(new URL(target, import.meta.url));
  mkdirSync(root, { recursive: true });
  const publicFiles = new Set([
    'one-cube',
    'cube-plus-two-fragments',
    'two-intended-parts',
  ]);
  for (const [name, values] of Object.entries(fixtures)) {
    if (target.includes('public') && !publicFiles.has(name)) {
      continue;
    }
    writeFileSync(root + name + '-ascii.stl', asciiFixture(values));
    writeFileSync(
      root + name + '-binary.stl',
      new Uint8Array(binaryFixture(values)),
    );
  }
}

const privateRoot = fileURLToPath(
  new URL('../../test-fixtures/stl/floating-parts/', import.meta.url),
);
const large = Array.from({ length: 10000 }, (_, index) =>
  cubeTriangles(1, [(index % 200) * 3, Math.floor(index / 200) * 3, 0]),
).flat();
writeFileSync(
  privateRoot + 'large-10000-pieces-binary.stl',
  new Uint8Array(binaryFixture(large)),
);
const cube = binaryFixture(cubeTriangles());
writeFileSync(
  privateRoot + 'truncated-binary.stl',
  new Uint8Array(cube.slice(0, -1)),
);
const invalid = binaryFixture(cubeTriangles());
new DataView(invalid).setFloat32(96, NaN, true);
writeFileSync(privateRoot + 'non-finite-binary.stl', new Uint8Array(invalid));
