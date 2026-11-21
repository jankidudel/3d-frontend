import { PublicRouteUrl } from '../../core/seo/public-routes';
import { ModelDimensions } from '../../shared/model-dimensions';
import { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-model';

export type PreflightStatus =
  'Needs attention' | 'Check before slicing' | 'No issue found in this check';

export interface MeshIntegrityReport {
  readonly openEdges: number;
  readonly nonManifoldEdges: number;
  readonly degenerateTriangles: number;
  readonly duplicateTriangles: number;
  readonly shells: number;
  readonly orientationConflicts: number;
  readonly volume: number | null;
  readonly volumeReliable: boolean;
}

export interface PreflightAction {
  readonly label: string;
  readonly route: string;
  readonly reason: string;
}

export const UNIT_AMBIGUITY_MESSAGE =
  'STL coordinates have no declared unit. Review these results using the unit you expect from the source model.';
export const WALL_THICKNESS_LIMITATION_MESSAGE =
  'This is a sampled normal-direction screen, not a substitute for slicer, material or load-specific requirements.';

export function inspectMesh(
  mesh: IndexedTriangleGeometry,
): MeshIntegrityReport {
  const edgeCounts = new Map<string, number>();
  const triangles = new Map<string, number>();
  const directions = new Map<string, number>();
  // Weld exactly equal coordinates, including duplicated vertices across 3MF placements.
  const lookup = new Map<string, number>();
  const remap: number[] = [];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const point = Array.from(mesh.positions.slice(i, i + 3));
    if (!point.every(Number.isFinite)) {
      throw new Error('The mesh contains nonfinite coordinates.');
    }
    const key = point.join(':');
    if (!lookup.has(key)) {
      lookup.set(key, lookup.size);
    }
    remap.push(lookup.get(key)!);
  }
  const parent = Array.from({ length: lookup.size }, (_, i) => i);
  const root = (index: number): number => {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  };
  const used = new Set<number>();
  let degenerateTriangles = 0;
  let signedVolume = 0;
  for (let index = 0; index < mesh.indices.length; index += 3) {
    const triangle = [
      mesh.indices[index],
      mesh.indices[index + 1],
      mesh.indices[index + 2],
    ];
    const a = triangle[0] * 3;
    const b = triangle[1] * 3;
    const c = triangle[2] * 3;
    const ax = mesh.positions[a];
    const ay = mesh.positions[a + 1];
    const az = mesh.positions[a + 2];
    const bx = mesh.positions[b];
    const by = mesh.positions[b + 1];
    const bz = mesh.positions[b + 2];
    const cx = mesh.positions[c];
    const cy = mesh.positions[c + 1];
    const cz = mesh.positions[c + 2];
    const areaTwiceX = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const areaTwiceY = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const areaTwiceZ = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (
      new Set(triangle).size !== 3 ||
      areaTwiceX * areaTwiceX +
        areaTwiceY * areaTwiceY +
        areaTwiceZ * areaTwiceZ ===
        0
    ) {
      degenerateTriangles += 1;
      continue;
    }
    const welded = triangle.map((index) => remap[index]);
    const signature = [...welded].sort((a, b) => a - b).join(':');
    triangles.set(signature, (triangles.get(signature) ?? 0) + 1);
    for (const [a, b] of [
      [welded[0], welded[1]],
      [welded[1], welded[2]],
      [welded[2], welded[0]],
    ]) {
      const edge = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeCounts.set(edge, (edgeCounts.get(edge) ?? 0) + 1);
      directions.set(edge, (directions.get(edge) ?? 0) + (a < b ? 1 : -1));
      parent[root(b)] = root(a);
      used.add(a);
      used.add(b);
    }
    signedVolume +=
      ax * (by * cz - bz * cy) -
      ay * (bx * cz - bz * cx) +
      az * (bx * cy - by * cx);
  }
  const openEdges = [...edgeCounts.values()].filter(
    (count) => count === 1,
  ).length;
  const nonManifoldEdges = [...edgeCounts.values()].filter(
    (count) => count > 2,
  ).length;
  const duplicateTriangles = [...triangles.values()].reduce(
    (total, count) => total + Math.max(0, count - 1),
    0,
  );
  const shells = new Set(Array.from(used, root)).size;
  const orientationConflicts = [...edgeCounts.entries()].filter(
    ([edge, count]) => count === 2 && directions.get(edge) !== 0,
  ).length;
  const volumeReliable =
    openEdges === 0 &&
    nonManifoldEdges === 0 &&
    degenerateTriangles === 0 &&
    duplicateTriangles === 0 &&
    orientationConflicts === 0 &&
    shells === 1;
  return {
    openEdges,
    nonManifoldEdges,
    degenerateTriangles,
    duplicateTriangles,
    shells,
    orientationConflicts,
    volume: volumeReliable ? Math.abs(signedVolume / 6) : null,
    volumeReliable,
  };
}

export function meshDimensions(mesh: IndexedTriangleGeometry): ModelDimensions {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let index = 0; index < mesh.positions.length; index += 3) {
    minX = Math.min(minX, mesh.positions[index]);
    maxX = Math.max(maxX, mesh.positions[index]);
    minY = Math.min(minY, mesh.positions[index + 1]);
    maxY = Math.max(maxY, mesh.positions[index + 1]);
    minZ = Math.min(minZ, mesh.positions[index + 2]);
    maxZ = Math.max(maxZ, mesh.positions[index + 2]);
  }
  return { width: maxX - minX, height: maxY - minY, depth: maxZ - minZ };
}

export function preflightStatus(
  integrity: MeshIntegrityReport,
  thinAreas: boolean,
  fitsPrinter: boolean | null,
): PreflightStatus {
  if (
    integrity.openEdges ||
    integrity.nonManifoldEdges ||
    integrity.degenerateTriangles ||
    integrity.orientationConflicts ||
    fitsPrinter === false
  ) {
    return 'Needs attention';
  }
  if (
    integrity.duplicateTriangles ||
    !integrity.volumeReliable ||
    thinAreas ||
    fitsPrinter === null
  ) {
    return 'Check before slicing';
  }
  return 'No issue found in this check';
}

export function preflightActions(
  integrity: MeshIntegrityReport,
  thinAreas: boolean,
  fitsPrinter: boolean | null,
  triangleCount: number,
): readonly PreflightAction[] {
  const actions: PreflightAction[] = [];
  actions.push({
    label: 'Review overhang risk',
    route: PublicRouteUrl.StlOverhangChecker,
    reason:
      'Screen downward-facing geometry and compare sensible 90-degree rotations before slicing.',
  });
  if (
    integrity.openEdges ||
    integrity.nonManifoldEdges ||
    integrity.degenerateTriangles ||
    integrity.orientationConflicts ||
    integrity.duplicateTriangles
  ) {
    actions.push({
      label: 'Repair STL',
      route: PublicRouteUrl.StlRepair,
      reason: 'Resolve the reported mesh issues, then run preflight again.',
    });
  }
  if (fitsPrinter === false) {
    actions.push({
      label: 'Check dimensions and scale',
      route: PublicRouteUrl.DimensionsChecker,
      reason: 'Review the best right-angle orientation or resize a copy.',
    });
  }
  if (thinAreas) {
    actions.push({
      label: 'Review wall thickness',
      route: PublicRouteUrl.StlWallThicknessChecker,
      reason:
        'Inspect sampled thin areas against your printer and material requirements.',
    });
  }
  if (triangleCount > 500000) {
    actions.push({
      label: 'Reduce file size',
      route: PublicRouteUrl.StlFileSizeReducer,
      reason: 'A very dense mesh can make slicers slow or difficult to use.',
    });
  }
  if (integrity.volumeReliable && fitsPrinter === false) {
    actions.push({
      label: 'Split the STL',
      route: PublicRouteUrl.StlSplitter,
      reason: 'A valid oversized model may be more practical as capped parts.',
    });
  }
  return actions;
}
