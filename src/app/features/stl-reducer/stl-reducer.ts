export type StlEncoding = 'ASCII STL' | 'binary STL';

export interface StlMesh {
  readonly encoding: StlEncoding;
  readonly indices: Uint32Array;
  readonly positions: Float32Array;
}

export interface StlMetrics {
  readonly bytes: number;
  readonly dimensions: readonly [number, number, number];
  readonly triangleCount: number;
  readonly warnings: readonly string[];
}

const BINARY_HEADER_BYTES = 80;
const BINARY_PREFIX_BYTES = 84;
const BINARY_TRIANGLE_BYTES = 50;

export function isBinaryStl(bytes: ArrayBuffer): boolean {
  if (bytes.byteLength < BINARY_PREFIX_BYTES) {
    return false;
  }
  const view = new DataView(bytes);
  return (
    view.getUint32(BINARY_HEADER_BYTES, true) * BINARY_TRIANGLE_BYTES +
      BINARY_PREFIX_BYTES ===
    bytes.byteLength
  );
}

export async function readStl(file: File): Promise<StlMesh> {
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength === 0) {
    throw new Error('The selected STL file is empty.');
  }
  const encoding: StlEncoding = isBinaryStl(bytes) ? 'binary STL' : 'ASCII STL';
  const text = encoding === 'ASCII STL' ? new TextDecoder().decode(bytes) : '';
  const vertices =
    encoding === 'ASCII STL' ? parseAscii(text) : parseBinary(bytes);
  if (vertices.length === 0 || vertices.length % 9 !== 0) {
    throw new Error(
      'We could not read that STL file. Choose a valid ASCII or binary STL file.',
    );
  }
  return weldVertices(vertices, encoding);
}

export function metrics(mesh: StlMesh, bytes: number): StlMetrics {
  const warnings: string[] = [];
  const edgeCounts = new Map<string, number>();
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const triangle = [
      mesh.indices[index],
      mesh.indices[index + 1],
      mesh.indices[index + 2],
    ];
    if (new Set(triangle).size !== 3) {
      warnings.push('Degenerate triangles detected.');
      break;
    }
    for (const [a, b] of [
      [triangle[0], triangle[1]],
      [triangle[1], triangle[2]],
      [triangle[2], triangle[0]],
    ]) {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }
  if ([...edgeCounts.values()].some((count) => count !== 2)) {
    warnings.push('Open or non-manifold edges detected.');
  }
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (let index = 0; index < mesh.positions.length; index += 3) {
    minX = Math.min(minX, mesh.positions[index]);
    maxX = Math.max(maxX, mesh.positions[index]);
    minY = Math.min(minY, mesh.positions[index + 1]);
    maxY = Math.max(maxY, mesh.positions[index + 1]);
    minZ = Math.min(minZ, mesh.positions[index + 2]);
    maxZ = Math.max(maxZ, mesh.positions[index + 2]);
  }
  return {
    bytes,
    dimensions: [maxX - minX, maxY - minY, maxZ - minZ],
    triangleCount: mesh.indices.length / 3,
    warnings,
  };
}

export function writeBinaryStl(mesh: StlMesh): Blob {
  const buffer = new ArrayBuffer(
    BINARY_PREFIX_BYTES + (mesh.indices.length / 3) * BINARY_TRIANGLE_BYTES,
  );
  const view = new DataView(buffer);
  view.setUint32(BINARY_HEADER_BYTES, mesh.indices.length / 3, true);
  let offset = BINARY_PREFIX_BYTES;
  for (let index = 0; index < mesh.indices.length; index += 3) {
    offset += 12;
    for (const vertexIndex of [
      mesh.indices[index],
      mesh.indices[index + 1],
      mesh.indices[index + 2],
    ]) {
      const positionOffset = vertexIndex * 3;
      view.setFloat32(offset, mesh.positions[positionOffset], true);
      view.setFloat32(offset + 4, mesh.positions[positionOffset + 1], true);
      view.setFloat32(offset + 8, mesh.positions[positionOffset + 2], true);
      offset += 12;
    }
    view.setUint16(offset, 0, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'model/stl' });
}

export async function simplify(
  mesh: StlMesh,
  keepPercent: number,
): Promise<StlMesh> {
  const { MeshoptSimplifier } = await import('meshoptimizer/simplifier');
  await MeshoptSimplifier.ready;
  const target = Math.max(
    3,
    Math.floor((mesh.indices.length * keepPercent) / 300) * 3,
  );
  const [indices] = MeshoptSimplifier.simplify(
    mesh.indices,
    mesh.positions,
    3,
    target,
    1e-2,
    ['LockBorder'],
  );
  return { ...mesh, indices };
}

function parseAscii(text: string): number[] {
  if (!/^\s*solid\b/i.test(text) || !/endsolid\b[^\r\n]*\s*$/i.test(text)) {
    throw new Error(
      'We could not read that STL file. Choose a valid ASCII or binary STL file.',
    );
  }
  const values: number[] = [];
  const expression = /vertex\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)/gi;
  for (const match of text.matchAll(expression)) {
    const coordinates = match.slice(1).map(Number);
    if (coordinates.some((coordinate) => !Number.isFinite(coordinate))) {
      throw new Error('The STL contains invalid vertex coordinates.');
    }
    values.push(...coordinates);
  }
  return values;
}

function parseBinary(bytes: ArrayBuffer): number[] {
  const view = new DataView(bytes);
  const triangles = view.getUint32(BINARY_HEADER_BYTES, true);
  const values: number[] = [];
  for (let triangle = 0; triangle < triangles; triangle += 1) {
    let offset = BINARY_PREFIX_BYTES + triangle * BINARY_TRIANGLE_BYTES + 12;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      values.push(
        view.getFloat32(offset, true),
        view.getFloat32(offset + 4, true),
        view.getFloat32(offset + 8, true),
      );
      offset += 12;
    }
  }
  return values;
}

function weldVertices(values: number[], encoding: StlEncoding): StlMesh {
  const lookup = new Map<string, number>();
  const positions: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < values.length; index += 3) {
    const key = `${values[index]},${values[index + 1]},${values[index + 2]}`;
    let vertexIndex = lookup.get(key);
    if (vertexIndex === undefined) {
      vertexIndex = positions.length / 3;
      lookup.set(key, vertexIndex);
      positions.push(values[index], values[index + 1], values[index + 2]);
    }
    indices.push(vertexIndex);
  }
  return {
    encoding,
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}
