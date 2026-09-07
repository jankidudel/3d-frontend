import { ModelDimensions } from '../../shared/model-dimensions';
import { StlMesh } from '../stl-reducer/stl-reducer';

export type PreflightStatus =
  'Needs attention' | 'Check before slicing' | 'No issue found in this check';

export interface MeshIntegrityReport {
  readonly openEdges: number;
  readonly nonManifoldEdges: number;
  readonly degenerateTriangles: number;
  readonly duplicateTriangles: number;
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

export function inspectMesh(mesh: StlMesh): MeshIntegrityReport {
  const edgeCounts = new Map<string, number>();
  const triangles = new Map<string, number>();
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
    const signature = [...triangle].sort((a, b) => a - b).join(':');
    triangles.set(signature, (triangles.get(signature) ?? 0) + 1);
    for (const [a, b] of [
      [triangle[0], triangle[1]],
      [triangle[1], triangle[2]],
      [triangle[2], triangle[0]],
    ]) {
      const edge = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeCounts.set(edge, (edgeCounts.get(edge) ?? 0) + 1);
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
  const volumeReliable =
    openEdges === 0 && nonManifoldEdges === 0 && degenerateTriangles === 0;
  return {
    openEdges,
    nonManifoldEdges,
    degenerateTriangles,
    duplicateTriangles,
    volume: volumeReliable ? Math.abs(signedVolume / 6) : null,
    volumeReliable,
  };
}

export function meshDimensions(mesh: StlMesh): ModelDimensions {
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
  if (
    integrity.openEdges ||
    integrity.nonManifoldEdges ||
    integrity.degenerateTriangles ||
    integrity.duplicateTriangles
  ) {
    actions.push({
      label: 'Repair STL',
      route: '/stl-repair',
      reason: 'Resolve the reported mesh issues, then run preflight again.',
    });
  }
  if (fitsPrinter === false) {
    actions.push({
      label: 'Check dimensions and scale',
      route: '/stl-dimensions-checker',
      reason: 'Review the best right-angle orientation or resize a copy.',
    });
  }
  if (thinAreas) {
    actions.push({
      label: 'Review wall thickness',
      route: '/stl-wall-thickness-checker',
      reason:
        'Inspect sampled thin areas against your printer and material requirements.',
    });
  }
  if (triangleCount > 500000) {
    actions.push({
      label: 'Reduce file size',
      route: '/stl-file-size-reducer',
      reason: 'A very dense mesh can make slicers slow or difficult to use.',
    });
  }
  if (integrity.volumeReliable && fitsPrinter === false) {
    actions.push({
      label: 'Split the STL',
      route: '/stl-splitter',
      reason: 'A valid oversized model may be more practical as capped parts.',
    });
  }
  return actions;
}
