import {
  calculateBuildVolumeFit,
  ModelDimensions,
  ModelUnit,
} from '../../shared/model-dimensions';
import { PrinterProfile } from '../../core/printer/printer-profile.service';
import {
  analyseOverhangs,
  OverhangReport,
} from '../shared/overhang/overhang-analysis';
import { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-analysis';

type Axis = 'x' | 'y' | 'z';

interface BuildDirection {
  readonly axis: Axis;
  readonly label: string;
  readonly vector: readonly [number, number, number];
}

export interface OrientationPlan {
  readonly label: string;
  readonly dimensions: ModelDimensions;
  readonly fit: ReturnType<typeof calculateBuildVolumeFit> | null;
  readonly overhang: OverhangReport;
  readonly bedContactArea: number;
}

const BUILD_DIRECTIONS: readonly BuildDirection[] = [
  { axis: 'z', label: 'Current orientation (+Z)', vector: [0, 0, 1] },
  { axis: 'z', label: 'Turn upside down (-Z)', vector: [0, 0, -1] },
  { axis: 'x', label: 'Build along +X', vector: [1, 0, 0] },
  { axis: 'x', label: 'Build along -X', vector: [-1, 0, 0] },
  { axis: 'y', label: 'Build along +Y', vector: [0, 1, 0] },
  { axis: 'y', label: 'Build along -Y', vector: [0, -1, 0] },
];

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
    if (
      magnitude &&
      (nx * direction[0] + ny * direction[1] + nz * direction[2]) / magnitude <
        -0.95
    ) {
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
): readonly OrientationPlan[] {
  const ranges = axisRanges(mesh);
  return BUILD_DIRECTIONS.flatMap((direction) => {
    const overhang = analyseOverhangs(mesh, threshold, direction.vector);
    if (!overhang) {
      return [];
    }
    const dimensions = dimensionsFor(direction.axis, ranges);
    return [
      {
        label: direction.label,
        dimensions,
        fit: printerProfile
          ? calculateBuildVolumeFit(
              dimensions,
              modelUnit,
              {
                width: printerProfile.width,
                height: printerProfile.height,
                depth: printerProfile.depth,
              },
              printerProfile.unit,
            )
          : null,
        overhang,
        bedContactArea: bedContactArea(mesh, direction.vector),
      },
    ];
  }).sort(
    (a, b) =>
      Number(Boolean(a.fit && !a.fit.fits)) -
        Number(Boolean(b.fit && !b.fit.fits)) ||
      a.overhang.flaggedPercentage - b.overhang.flaggedPercentage ||
      b.bedContactArea - a.bedContactArea,
  );
}
