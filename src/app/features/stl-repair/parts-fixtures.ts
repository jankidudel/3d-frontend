/** Original analytical geometry. No customer models or physical print claims. */
export function cubeTriangles(size = 20, origin = [0, 0, 0]): number[] {
  const vertices = [
    [0, 0, 0],
    [size, 0, 0],
    [size, size, 0],
    [0, size, 0],
    [0, 0, size],
    [size, 0, size],
    [size, size, size],
    [0, size, size],
  ];
  const faces = [
    0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0,
    4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5,
  ];
  return faces.flatMap((index) =>
    vertices[index].map((value, axis) => value + origin[axis]),
  );
}
export function tetraTriangles(size: number, origin: number[]): number[] {
  const vertices = [
    [0, 0, 0],
    [size, 0, 0],
    [0, size, 0],
    [0, 0, size],
  ];
  return [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3].flatMap((index) =>
    vertices[index].map((value, axis) => value + origin[axis]),
  );
}
export function demoTriangles(): number[] {
  return [
    ...cubeTriangles(),
    ...tetraTriangles(3, [28, 0, 6]),
    ...tetraTriangles(2, [-8, 6, 12]),
  ];
}
export function asciiFixture(values: readonly number[]): string {
  const lines = ['solid inspectmesh_synthetic'];
  for (let offset = 0; offset < values.length; offset += 9) {
    lines.push('facet normal 0 0 0', 'outer loop');
    for (let corner = 0; corner < 3; corner++) {
      lines.push(
        'vertex ' +
          values.slice(offset + corner * 3, offset + corner * 3 + 3).join(' '),
      );
    }
    lines.push('endloop', 'endfacet');
  }
  lines.push('endsolid inspectmesh_synthetic');
  return lines.join('\n');
}
export function binaryFixture(values: readonly number[]): ArrayBuffer {
  const bytes = new ArrayBuffer(84 + (values.length / 9) * 50);
  const view = new DataView(bytes);
  view.setUint32(80, values.length / 9, true);
  for (let face = 0; face < values.length / 9; face++) {
    for (let axis = 0; axis < 9; axis++) {
      view.setFloat32(
        84 + face * 50 + 12 + axis * 4,
        values[face * 9 + axis],
        true,
      );
    }
  }
  return bytes;
}
export function floatingPartsDemo(): File {
  return new File(
    [binaryFixture(demoTriangles())],
    'cube-plus-two-fragments.stl',
    { type: 'model/stl' },
  );
}
