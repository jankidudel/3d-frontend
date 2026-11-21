import {
  assessEnvelope,
  EnvelopeAssessment,
  EnvelopeState,
} from '../../core/printer/build-space';
import { printerProfileMm } from '../../core/printer/printer-profile.service';
import { ModelDimensions, ModelUnit } from '../../shared/model-dimensions';
import { PrinterProfile } from '../../core/printer/printer-profile.service';
import {
  analyseOverhangs,
  OVERHANG_BUILD_DIRECTIONS,
  OverhangReport,
} from '../shared/overhang/overhang-analysis';
import { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-model';

type Axis = 'x' | 'y' | 'z';

export interface OrientationPlan {
  readonly id: string;
  readonly label: string;
  readonly sourceAxisUp: string;
  readonly transform: string;
  readonly dimensions: ModelDimensions;
  readonly fit: (EnvelopeAssessment & { fits: boolean }) | null;
  readonly overhang: OverhangReport;
  readonly bedContactArea: number;
}

const ORIENTATION_TRANSFORMS = [
  { axis: 'z', transform: 'Keep the source rotation' },
  { axis: 'z', transform: 'Rotate 180° about source X' },
  { axis: 'x', transform: 'Rotate +90° about source Y' },
  { axis: 'x', transform: 'Rotate -90° about source Y' },
  { axis: 'y', transform: 'Rotate -90° about source X' },
  { axis: 'y', transform: 'Rotate +90° about source X' },
] as const;

export function printerProfileAfterEdgeAllowance(
  profile: PrinterProfile,
  allowance: number,
): PrinterProfile | null {
  if (!Number.isFinite(allowance) || allowance < 0) {
    return null;
  }
  const p = printerProfileMm(profile);
  const x = p.x - 2 * allowance,
    y = p.y - 2 * allowance;
  if (x <= 0 || y <= 0) {
    return null;
  }
  return {
    ...p,
    x,
    y,
    diameter: p.diameter === undefined ? undefined : p.diameter - 2 * allowance,
  };
}

function axisRanges(mesh: IndexedTriangleGeometry): Record<Axis, number> {
  const bounds = {
    x: [Infinity, -Infinity],
    y: [Infinity, -Infinity],
    z: [Infinity, -Infinity],
  };
  for (let index = 0; index < mesh.positions.length; index += 3) {
    for (const [axis, offset] of [
      ['x', 0],
      ['y', 1],
      ['z', 2],
    ] as const) {
      bounds[axis][0] = Math.min(
        bounds[axis][0],
        mesh.positions[index + offset],
      );
      bounds[axis][1] = Math.max(
        bounds[axis][1],
        mesh.positions[index + offset],
      );
    }
  }
  return {
    x: bounds.x[1] - bounds.x[0],
    y: bounds.y[1] - bounds.y[0],
    z: bounds.z[1] - bounds.z[0],
  };
}

function dimensionsFor(
  axis: Axis,
  ranges: Record<Axis, number>,
): ModelDimensions {
  if (axis === 'x') {
    return { width: ranges.y, height: ranges.z, depth: ranges.x };
  }
  if (axis === 'y') {
    return { width: ranges.x, height: ranges.z, depth: ranges.y };
  }
  return { width: ranges.x, height: ranges.y, depth: ranges.z };
}

function bedContactArea(
  mesh: IndexedTriangleGeometry,
  direction: readonly [number, number, number],
): number {
  const projection = (index: number) =>
    mesh.positions[index] * direction[0] +
    mesh.positions[index + 1] * direction[1] +
    mesh.positions[index + 2] * direction[2];
  let minimum = Infinity;
  let maximum = -Infinity;
  for (let index = 0; index < mesh.positions.length; index += 3) {
    const value = projection(index);
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  const tolerance = Math.max((maximum - minimum) * 1e-6, 1e-6);
  let area = 0;
  const countedTriangles = new Set<string>();
  for (let triangle = 0; triangle < mesh.indices.length; triangle += 3) {
    const a = mesh.indices[triangle] * 3;
    const b = mesh.indices[triangle + 1] * 3;
    const c = mesh.indices[triangle + 2] * 3;
    if (
      projection(a) > minimum + tolerance ||
      projection(b) > minimum + tolerance ||
      projection(c) > minimum + tolerance
    ) {
      continue;
    }
    const abx = mesh.positions[b] - mesh.positions[a];
    const aby = mesh.positions[b + 1] - mesh.positions[a + 1];
    const abz = mesh.positions[b + 2] - mesh.positions[a + 2];
    const acx = mesh.positions[c] - mesh.positions[a];
    const acy = mesh.positions[c + 1] - mesh.positions[a + 1];
    const acz = mesh.positions[c + 2] - mesh.positions[a + 2];
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const magnitude = Math.hypot(nx, ny, nz);
    if (!magnitude) {
      continue;
    }
    const vertices = [a, b, c]
      .map((offset) =>
        [
          mesh.positions[offset],
          mesh.positions[offset + 1],
          mesh.positions[offset + 2],
        ].join(','),
      )
      .sort()
      .join('|');
    if (
      (nx * direction[0] + ny * direction[1] + nz * direction[2]) / magnitude <
        -0.95 &&
      !countedTriangles.has(vertices)
    ) {
      countedTriangles.add(vertices);
      area += magnitude / 2;
    }
  }
  return area;
}

export function planOrientations(
  mesh: IndexedTriangleGeometry,
  threshold: number,
  modelUnit: ModelUnit,
  printerProfile: PrinterProfile | null,
  edge = 0,
  expansion = 0,
): readonly OrientationPlan[] {
  const ranges = axisRanges(mesh);
  return OVERHANG_BUILD_DIRECTIONS.flatMap((direction, index) => {
    const transform = ORIENTATION_TRANSFORMS[index];
    const overhang = analyseOverhangs(mesh, threshold, direction.direction);
    if (!overhang) {
      return [];
    }
    const dimensions = dimensionsFor(transform.axis, ranges);
    return [
      {
        id: direction.id,
        label: direction.label,
        sourceAxisUp: direction.shortLabel,
        transform: transform.transform,
        dimensions,
        fit: printerProfile
          ? (() => {
              const assessment = assessEnvelope(
                dimensions,
                modelUnit,
                printerProfile,
                edge,
                expansion,
              );
              return {
                ...assessment,
                fits: assessment.state === EnvelopeState.Contained,
              };
            })()
          : null,
        overhang,
        bedContactArea: bedContactArea(mesh, direction.direction),
      },
    ];
  });
}
