import { IndexedTriangleGeometry } from '../wall-thickness/wall-thickness-analysis';

export interface OverhangFace {
  readonly triangle: number;
  readonly area: number;
  readonly slope: number;
  readonly flagged: boolean;
}

export interface OverhangReport {
  readonly faces: readonly OverhangFace[];
  readonly flaggedCount: number;
  readonly flaggedArea: number;
  readonly totalArea: number;
  readonly flaggedPercentage: number;
  readonly threshold: number;
}

export interface OrientationComparison {
  readonly label: string;
  readonly report: OverhangReport;
}

const BUILD_DIRECTIONS = [
  { label: 'Current orientation (+Z build direction)', direction: [0, 0, 1] },
  { label: 'Rotate 90 degrees about X', direction: [0, 1, 0] },
  { label: 'Rotate 90 degrees about Y', direction: [1, 0, 0] },
] as const;

export function validOverhangThreshold(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value < 90;
}

/**
 * Flags downward-facing faces whose surface slope from vertical exceeds the
 * selected threshold. Face winding is significant: reversed faces are not
 * silently treated as downward surfaces.
 */
export function analyseOverhangs(
  mesh: IndexedTriangleGeometry,
  threshold: number,
  buildDirection: readonly number[] = [0, 0, 1],
): OverhangReport | null {
  if (!validOverhangThreshold(threshold) || mesh.indices.length % 3 !== 0) {
    return null;
  }
  const length = Math.hypot(...buildDirection);
  if (length === 0) {
    return null;
  }
  const [dx, dy, dz] = buildDirection.map((value) => value / length);
  const faces: OverhangFace[] = [];
  let flaggedArea = 0;
  let totalArea = 0;
  for (let triangle = 0; triangle < mesh.indices.length / 3; triangle++) {
    const offset = triangle * 3;
    const a = mesh.indices[offset] * 3;
    const b = mesh.indices[offset + 1] * 3;
    const c = mesh.indices[offset + 2] * 3;
    const abx = mesh.positions[b] - mesh.positions[a];
    const aby = mesh.positions[b + 1] - mesh.positions[a + 1];
    const abz = mesh.positions[b + 2] - mesh.positions[a + 2];
    const acx = mesh.positions[c] - mesh.positions[a];
    const acy = mesh.positions[c + 1] - mesh.positions[a + 1];
    const acz = mesh.positions[c + 2] - mesh.positions[a + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const twiceArea = Math.hypot(nx, ny, nz);
    if (twiceArea === 0) {
      continue;
    }
    const area = twiceArea / 2;
    const dot = (nx * dx + ny * dy + nz * dz) / twiceArea;
    const slope = dot < 0 ? (Math.asin(Math.min(1, -dot)) * 180) / Math.PI : 0;
    const flagged = dot < 0 && slope > threshold;
    faces.push({ triangle, area, slope, flagged });
    totalArea += area;
    if (flagged) {
      flaggedArea += area;
    }
  }
  return {
    faces,
    flaggedCount: faces.filter((face) => face.flagged).length,
    flaggedArea,
    totalArea,
    flaggedPercentage: totalArea ? (flaggedArea / totalArea) * 100 : 0,
    threshold,
  };
}

export function compareOverhangOrientations(
  mesh: IndexedTriangleGeometry,
  threshold: number,
): readonly OrientationComparison[] {
  return BUILD_DIRECTIONS.flatMap(({ label, direction }) => {
    const report = analyseOverhangs(mesh, threshold, direction);
    return report ? [{ label, report }] : [];
  });
}
