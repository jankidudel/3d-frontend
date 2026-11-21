import { IndexedTriangleGeometry } from '../wall-thickness/wall-thickness-model';

export interface OverhangFace {
  readonly triangle: number;
  readonly area: number;
  readonly slope: number;
  readonly flagged: boolean;
}

export interface OverhangReport {
  readonly faces: readonly OverhangFace[];
  readonly analysedTriangleCount: number;
  readonly degenerateTriangleCount: number;
  readonly flaggedCount: number;
  readonly flaggedArea: number;
  readonly totalArea: number;
  readonly flaggedPercentage: number;
  readonly threshold: number;
  readonly buildDirection: readonly [number, number, number];
}

export interface OrientationComparison {
  readonly label: string;
  readonly report: OverhangReport;
}

export const OverhangProcessProfile = {
  Fdm: 'FDM',
  Resin: 'Resin',
} as const;

export type OverhangProcessProfile =
  (typeof OverhangProcessProfile)[keyof typeof OverhangProcessProfile];

export const OverhangBuildDirection = {
  PositiveZ: 'positive-z',
  NegativeZ: 'negative-z',
  PositiveX: 'positive-x',
  NegativeX: 'negative-x',
  PositiveY: 'positive-y',
  NegativeY: 'negative-y',
} as const;

export type OverhangBuildDirection =
  (typeof OverhangBuildDirection)[keyof typeof OverhangBuildDirection];

export interface OverhangBuildDirectionOption {
  readonly id: OverhangBuildDirection;
  readonly label: string;
  readonly shortLabel: string;
  readonly direction: readonly [number, number, number];
}

export const OVERHANG_BUILD_DIRECTIONS: readonly OverhangBuildDirectionOption[] =
  [
    {
      id: OverhangBuildDirection.PositiveZ,
      label: '+Z up (source orientation)',
      shortLabel: '+Z',
      direction: [0, 0, 1],
    },
    {
      id: OverhangBuildDirection.NegativeZ,
      label: '-Z up',
      shortLabel: '-Z',
      direction: [0, 0, -1],
    },
    {
      id: OverhangBuildDirection.PositiveX,
      label: '+X up',
      shortLabel: '+X',
      direction: [1, 0, 0],
    },
    {
      id: OverhangBuildDirection.NegativeX,
      label: '-X up',
      shortLabel: '-X',
      direction: [-1, 0, 0],
    },
    {
      id: OverhangBuildDirection.PositiveY,
      label: '+Y up',
      shortLabel: '+Y',
      direction: [0, 1, 0],
    },
    {
      id: OverhangBuildDirection.NegativeY,
      label: '-Y up',
      shortLabel: '-Y',
      direction: [0, -1, 0],
    },
  ] as const;

const COMPARISON_DIRECTIONS = [
  OVERHANG_BUILD_DIRECTIONS[0],
  OVERHANG_BUILD_DIRECTIONS[4],
  OVERHANG_BUILD_DIRECTIONS[2],
] as const;

export function overhangBuildDirection(
  id: OverhangBuildDirection,
): OverhangBuildDirectionOption {
  return (
    OVERHANG_BUILD_DIRECTIONS.find((candidate) => candidate.id === id) ??
    OVERHANG_BUILD_DIRECTIONS[0]
  );
}

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
  const [dx, dy, dz] = buildDirection.map((value) => value / length) as [
    number,
    number,
    number,
  ];
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
    analysedTriangleCount: faces.length,
    degenerateTriangleCount: mesh.indices.length / 3 - faces.length,
    flaggedCount: faces.filter((face) => face.flagged).length,
    flaggedArea,
    totalArea,
    flaggedPercentage: totalArea ? (flaggedArea / totalArea) * 100 : 0,
    threshold,
    buildDirection: [dx, dy, dz],
  };
}

export function compareOverhangOrientations(
  mesh: IndexedTriangleGeometry,
  threshold: number,
): readonly OrientationComparison[] {
  return COMPARISON_DIRECTIONS.flatMap(({ label, direction }) => {
    const report = analyseOverhangs(mesh, threshold, direction);
    return report ? [{ label, report }] : [];
  });
}
