import { StlMesh, writeBinaryStl } from '../stl-reducer/stl-reducer';

export const MeshExample = {
  Cube: 'closed-20mm-cube',
  Open: 'open-face-cube',
  Changed: 'changed-24mm-width',
  Offset: 'offset-3mm',
  Retriangulated: 'retriangulated-cube',
  Degenerate: 'degenerate-face',
  NonManifold: 'non-manifold-face',
  Shells: 'two-shells',
} as const;
export type MeshExample = (typeof MeshExample)[keyof typeof MeshExample];
const CUBE_FACES = [
  0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4,
  7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
];
export function exampleMesh(kind: MeshExample = MeshExample.Cube): StlMesh {
  const width = kind === MeshExample.Changed ? 24 : 20;
  let positions = [
    0,
    0,
    0,
    width,
    0,
    0,
    width,
    20,
    0,
    0,
    20,
    0,
    0,
    0,
    20,
    width,
    0,
    20,
    width,
    20,
    20,
    0,
    20,
    20,
  ];
  let faces = [...CUBE_FACES];
  if (kind === MeshExample.Open) {
    faces = faces.slice(6);
  }
  if (kind === MeshExample.Offset) {
    positions = positions.map((value, i) => (i % 3 === 0 ? value + 3 : value));
  }
  if (kind === MeshExample.Retriangulated) {
    faces.splice(0, 6, 0, 3, 1, 1, 3, 2);
  }
  if (kind === MeshExample.Degenerate) {
    faces.push(0, 0, 1);
  }
  if (kind === MeshExample.NonManifold) {
    faces.push(0, 2, 1);
  }
  if (kind === MeshExample.Shells) {
    positions = [
      ...positions,
      ...positions.map((value, i) => (i % 3 === 0 ? value + 40 : value)),
    ];
    faces = [...faces, ...faces.map((index) => index + 8)];
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(faces),
    encoding: 'binary STL',
  };
}
export function exampleFile(kind: MeshExample): File {
  return new File([writeBinaryStl(exampleMesh(kind))], `${kind}.stl`, {
    type: 'model/stl',
  });
}
