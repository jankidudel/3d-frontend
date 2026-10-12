import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { isBinaryStl, writeBinaryStl } from '../stl-reducer/stl-reducer';

export const PartLimits = { Triangles: 500_000, PageSize: 30 } as const;
export const PartEncoding = {
  Ascii: 'ASCII STL',
  Binary: 'binary STL',
} as const;
export type PartEncoding = (typeof PartEncoding)[keyof typeof PartEncoding];
export interface PartMesh {
  positions: Float64Array | Float32Array;
  indices?: Uint32Array;
  encoding: PartEncoding;
}
export interface PartBounds {
  min: number[];
  max: number[];
  spans: number[];
}
export interface MeshPart {
  id: number;
  triangles: number;
  area: number;
  bounds: PartBounds;
}
export interface PartAnalysis {
  parts: MeshPart[];
  faceParts: Uint32Array;
  bounds: PartBounds;
  triangles: number;
  milliseconds: number;
}
function emptyBounds(): PartBounds {
  return {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
    spans: [0, 0, 0],
  };
}
function include(bounds: PartBounds, x: number, y: number, z: number): void {
  for (const [axis, value] of [x, y, z].entries()) {
    bounds.min[axis] = Math.min(bounds.min[axis], value);
    bounds.max[axis] = Math.max(bounds.max[axis], value);
    bounds.spans[axis] = bounds.max[axis] - bounds.min[axis];
  }
}
export function faceCoordinates(mesh: PartMesh, face: number): number[] {
  const values: number[] = [];
  for (let corner = 0; corner < 3; corner++) {
    const index = mesh.indices?.[face * 3 + corner] ?? face * 3 + corner;
    values.push(
      mesh.positions[index * 3],
      mesh.positions[index * 3 + 1],
      mesh.positions[index * 3 + 2],
    );
  }
  return values;
}
function normal(v: number[]): number[] {
  const ux = v[3] - v[0],
    uy = v[4] - v[1],
    uz = v[5] - v[2];
  const vx = v[6] - v[0],
    vy = v[7] - v[1],
    vz = v[8] - v[2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}
/** Exact coordinate identity, complete-edge adjacency, iterative union-find.
 * Point contacts and intersections without shared edges remain separate.
 * Zero-area faces require explicit standard repair before selection analysis.
 * Expected O(F alpha(F)) work and O(F) memory; no tolerance welds or solid tests.
 */
export function analyseParts(
  mesh: PartMesh,
  progress: (percent: number) => void = () => {},
): PartAnalysis {
  const started = performance.now();
  const count = (mesh.indices?.length ?? mesh.positions.length / 3) / 3;
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > PartLimits.Triangles ||
    mesh.positions.length % 3 !== 0
  ) {
    throw new Error(
      `Component analysis supports 1 to ${PartLimits.Triangles.toLocaleString('en-US')} complete triangles. Standard cleanup remains available.`,
    );
  }
  if (
    mesh.positions.some(
      (value) =>
        !Number.isFinite(value) || !Number.isFinite(Math.fround(value)),
    )
  ) {
    throw new Error('The STL contains invalid or out-of-range coordinates.');
  }
  if (mesh.indices?.some((index) => index >= mesh.positions.length / 3)) {
    throw new Error('The mesh contains an invalid vertex index.');
  }
  const parent = Uint32Array.from({ length: count }, (_, index) => index);
  const ranks = new Uint8Array(count);
  const root = (face: number): number => {
    while (parent[face] !== face) {
      parent[face] = parent[parent[face]];
      face = parent[face];
    }
    return face;
  };
  const join = (a: number, b: number): void => {
    a = root(a);
    b = root(b);
    if (a === b) {
      return;
    }
    if (ranks[a] < ranks[b]) {
      [a, b] = [b, a];
    }
    parent[b] = a;
    if (ranks[a] === ranks[b]) {
      ranks[a]++;
    }
  };
  const vertices = new Map<string, number>();
  const edges = new Map<string, number>();
  const areas = new Float64Array(count);
  for (let face = 0; face < count; face++) {
    const v = faceCoordinates(mesh, face);
    const area = Math.hypot(...normal(v)) / 2;
    if (!(area > 0) || !Number.isFinite(area)) {
      throw new Error(
        'Zero-area or numerically invalid faces found. Run explicit standard cleanup first, download its result, then select that file to analyse pieces. No triangles were silently discarded.',
      );
    }
    areas[face] = area;
    const ids: number[] = [];
    for (let corner = 0; corner < 3; corner++) {
      // String(-0) is "0": canonicalises signed zero for analysis only.
      const key = v.slice(corner * 3, corner * 3 + 3).join(',');
      let id = vertices.get(key);
      if (id === undefined) {
        id = vertices.size;
        vertices.set(key, id);
      }
      ids.push(id);
    }
    for (let corner = 0; corner < 3; corner++) {
      const a = ids[corner],
        b = ids[(corner + 1) % 3];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const other = edges.get(key);
      if (other === undefined) {
        edges.set(key, face);
      } else {
        // One representative handles all incidents, including non-manifold edges.
        join(face, other);
      }
    }
    if (face % 8192 === 0) {
      progress(Math.floor((face / count) * 80));
    }
  }
  const roots = new Map<number, number>();
  const parts: MeshPart[] = [];
  const faceParts = new Uint32Array(count);
  const bounds = emptyBounds();
  for (let face = 0; face < count; face++) {
    const representative = root(face);
    let id = roots.get(representative);
    if (id === undefined) {
      id = parts.length;
      roots.set(representative, id);
      parts.push({ id, triangles: 0, area: 0, bounds: emptyBounds() });
    }
    faceParts[face] = id;
    const part = parts[id];
    part.triangles++;
    part.area += areas[face];
    const v = faceCoordinates(mesh, face);
    for (let corner = 0; corner < 3; corner++) {
      include(part.bounds, v[corner * 3], v[corner * 3 + 1], v[corner * 3 + 2]);
      include(bounds, v[corner * 3], v[corner * 3 + 1], v[corner * 3 + 2]);
    }
  }
  progress(100);
  return {
    parts,
    faceParts,
    triangles: count,
    bounds,
    milliseconds: performance.now() - started,
  };
}
export function rankedParts(analysis: PartAnalysis): MeshPart[] {
  return [...analysis.parts].sort(
    (a, b) => b.area - a.area || b.triangles - a.triangles || a.id - b.id,
  );
}
export function closeLargestAreas(analysis: PartAnalysis): boolean {
  const [first, second] = rankedParts(analysis);
  return !!second && second.area >= first.area * 0.9;
}
/** Bounded STL reader retains ASCII doubles for exact analysis/export identity.
 * Binary counts are checked against byte length before allocating triangle arrays.
 */
export function parsePartStl(bytes: ArrayBuffer): PartMesh {
  if (!bytes.byteLength || bytes.byteLength > getMaxFileUploadSizeLimit()) {
    throw new Error('Choose a non-empty STL up to 25 MiB.');
  }
  if (isBinaryStl(bytes)) {
    const view = new DataView(bytes);
    const count = view.getUint32(80, true);
    if (!count || count > PartLimits.Triangles) {
      throw new Error('Component analysis supports up to 500,000 triangles.');
    }
    const positions = new Float32Array(count * 9);
    for (let face = 0; face < count; face++) {
      for (let axis = 0; axis < 9; axis++) {
        positions[face * 9 + axis] = view.getFloat32(
          84 + face * 50 + 12 + axis * 4,
          true,
        );
      }
    }
    return { positions, encoding: PartEncoding.Binary };
  }
  const text = new TextDecoder().decode(bytes);
  if (!/^\s*solid\b/i.test(text) || !/endsolid\b[^\r\n]*\s*$/i.test(text)) {
    throw new Error(
      'Malformed or truncated STL. Binary declared counts must match its complete byte length.',
    );
  }
  const body = text
    .replace(/^\s*solid[^\r\n]*[\r\n]/i, '')
    .replace(/endsolid\b[^\r\n]*\s*$/i, '');
  const facets =
    /facet\s+normal\s+\S+\s+\S+\s+\S+\s+outer\s+loop\s+vertex\s+(\S+)\s+(\S+)\s+(\S+)\s+vertex\s+(\S+)\s+(\S+)\s+(\S+)\s+vertex\s+(\S+)\s+(\S+)\s+(\S+)\s+endloop\s+endfacet/gi;
  const values: number[] = [];
  let end = 0;
  for (const match of body.matchAll(facets)) {
    if (body.slice(end, match.index).trim()) {
      throw new Error('Malformed ASCII STL facet structure.');
    }
    end = match.index + match[0].length;
    if (values.length / 9 >= PartLimits.Triangles) {
      throw new Error('Component analysis supports up to 500,000 triangles.');
    }
    values.push(...match.slice(1).map(Number));
  }
  if (body.slice(end).trim() || values.length === 0) {
    throw new Error('Malformed or empty ASCII STL.');
  }
  return { positions: new Float64Array(values), encoding: PartEncoding.Ascii };
}
export async function exportParts(
  mesh: PartMesh,
  analysis: PartAnalysis,
  removed: readonly number[],
): Promise<Blob> {
  if (
    removed.some(
      (id) => !Number.isInteger(id) || id < 0 || id >= analysis.parts.length,
    )
  ) {
    throw new Error('Invalid part selection. Analyse the original file again.');
  }
  const remove = new Set(removed);
  const kept =
    analysis.triangles -
    analysis.parts.reduce(
      (sum, part) => sum + (remove.has(part.id) ? part.triangles : 0),
      0,
    );
  if (!kept) {
    throw new Error('Keep at least one part before downloading.');
  }
  const values = new Float64Array(kept * 9);
  let offset = 0;
  for (let face = 0; face < analysis.triangles; face++) {
    if (!remove.has(analysis.faceParts[face])) {
      values.set(faceCoordinates(mesh, face), offset);
      offset += 9;
    }
  }
  if (offset !== kept * 9) {
    throw new Error('Triangle conservation check failed.');
  }
  let blob: Blob;
  if (mesh.encoding === PartEncoding.Binary) {
    const raw = await writeBinaryStl({
      positions: new Float32Array(values),
      indices: Uint32Array.from({ length: kept * 3 }, (_, i) => i),
      encoding: PartEncoding.Binary,
    }).arrayBuffer();
    const view = new DataView(raw);
    for (let face = 0; face < kept; face++) {
      const n = normal(Array.from(values.subarray(face * 9, face * 9 + 9)));
      const length = Math.hypot(...n);
      for (let axis = 0; axis < 3; axis++) {
        view.setFloat32(84 + face * 50 + axis * 4, n[axis] / length, true);
      }
    }
    blob = new Blob([raw], { type: 'model/stl' });
  } else {
    const lines = ['solid retained_parts'];
    const number = (value: number): string =>
      Object.is(value, -0) ? '-0' : String(value);
    for (let face = 0; face < kept; face++) {
      const v = Array.from(values.subarray(face * 9, face * 9 + 9));
      const n = normal(v);
      const length = Math.hypot(...n);
      lines.push(
        `facet normal ${n.map((axis) => number(axis / length)).join(' ')}`,
        'outer loop',
      );
      for (let corner = 0; corner < 3; corner++) {
        lines.push(
          `vertex ${v
            .slice(corner * 3, corner * 3 + 3)
            .map(number)
            .join(' ')}`,
        );
      }
      lines.push('endloop', 'endfacet');
    }
    lines.push('endsolid retained_parts');
    blob = new Blob([lines.join('\n')], { type: 'model/stl' });
  }
  // Verify the exact serialized bytes, original face order, coordinates and winding.
  const reopened = parsePartStl(await blob.arrayBuffer());
  if (
    reopened.positions.length !== values.length ||
    reopened.positions.some((v, i) => v !== values[i])
  ) {
    throw new Error('The saved STL failed retained-coordinate verification.');
  }
  return blob;
}
