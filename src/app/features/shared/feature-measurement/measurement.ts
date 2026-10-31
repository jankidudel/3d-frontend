/** Geometry policy: relative to the selected geometry and representable coordinates,
 * not a physical tolerance or the screen-space picking radius. */
export const MeasurementPolicy = {
  maxRecords: 20,
  maxNameLength: 80,
  relativeLegTolerance: 1e-12,
  coordinateUlpMultiplier: 8,
  minimumCircleSine: 1e-6,
  circleSegments: 96,
  pointerRadius: 24,
  touchRadius: 40,
} as const;
export const MeasurementType = {
  Distance: 'distance',
  Angle: 'angle',
  Circle: 'circle',
} as const;
export type MeasurementType =
  (typeof MeasurementType)[keyof typeof MeasurementType];
export const SelectionBasis = {
  Surface: 'surface',
  Vertex: 'mesh-vertex',
  Entered: 'entered-coordinates',
} as const;
export type SelectionBasis =
  (typeof SelectionBasis)[keyof typeof SelectionBasis];
export const MeasurementState = {
  Available: 'available',
  Unavailable: 'unavailable',
} as const;
export type MeasurementState =
  (typeof MeasurementState)[keyof typeof MeasurementState];
export const MeasurementFormat = { Stl: 'stl', ThreeMf: '3mf' } as const;
export type MeasurementFormat =
  (typeof MeasurementFormat)[keyof typeof MeasurementFormat];
export const LengthUnit = {
  Unknown: '',
  Mm: 'mm',
  Cm: 'cm',
  Inch: 'in',
} as const;
export type LengthUnit = (typeof LengthUnit)[keyof typeof LengthUnit];
export type Point3 = readonly [number, number, number];
export interface MeasurementPoint {
  readonly coordinates: Point3;
  readonly basis: SelectionBasis;
  readonly meshId?: string;
  readonly placedItemId?: string;
  readonly faceIndex?: number;
  readonly vertexIndex?: number;
}
export interface MeasurementContext {
  readonly format: MeasurementFormat;
  readonly offset: Point3;
  readonly declaredUnit: string;
}
export interface MeasurementResult {
  readonly state: MeasurementState;
  readonly reason?: string;
  readonly distance?: number;
  readonly delta?: Point3;
  readonly angleDegrees?: number;
  readonly radius?: number;
  readonly diameter?: number;
  readonly centre?: Point3;
  readonly normal?: Point3;
  readonly axisU?: Point3;
  readonly axisV?: Point3;
}
export interface MeasurementEntry {
  readonly id: string;
  readonly name: string;
  readonly type: MeasurementType;
  readonly points: readonly MeasurementPoint[];
  readonly result: MeasurementResult;
  readonly frame: string;
  readonly sourceUnit: string;
  readonly coordinateToMm: number | null;
  readonly resultLengthUnit: string;
  readonly displayedLengthUnit: string;
  readonly placedItemIds: readonly string[];
  readonly spansPlacedItems: boolean | null;
  readonly notes: readonly string[];
}
export const subtract = (a: Point3, b: Point3): Point3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];
export const add = (a: Point3, b: Point3): Point3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
export const multiply = (a: Point3, s: number): Point3 => [
  a[0] * s,
  a[1] * s,
  a[2] * s,
];
const dot = (a: Point3, b: Point3): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Point3, b: Point3): Point3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const length = (a: Point3): number => Math.hypot(...a);
const unavailable = (reason: string): MeasurementResult => ({
  state: MeasurementState.Unavailable,
  reason,
});
export function calculateMeasurement(
  type: MeasurementType,
  points: readonly Point3[],
): MeasurementResult {
  const count = type === MeasurementType.Distance ? 2 : 3;
  if (
    points.length !== count ||
    points.some((p) => p.some((v) => !Number.isFinite(v)))
  ) {
    return unavailable('Select the required number of finite points.');
  }
  const [a, b, c] = points;
  const ab = subtract(b, a);
  const abLength = length(ab);
  if (type === MeasurementType.Distance) {
    if (!Number.isFinite(abLength)) {
      return unavailable('Distance exceeds the supported numeric range.');
    }
    return {
      state: MeasurementState.Available,
      distance: abLength,
      delta: ab.map(Math.abs) as unknown as Point3,
    };
  }
  // Work in local, normalized coordinates to avoid squared world magnitudes.
  const u = type === MeasurementType.Angle ? subtract(a, b) : ab;
  const v = type === MeasurementType.Angle ? subtract(c, b) : subtract(c, a);
  const lu = length(u),
    lv = length(v),
    scale = Math.max(lu, lv);
  const coordinateScale = Math.max(...points.flat().map(Math.abs));
  const minimumLeg = Math.max(
    scale * MeasurementPolicy.relativeLegTolerance,
    coordinateScale *
      Number.EPSILON *
      MeasurementPolicy.coordinateUlpMultiplier,
  );
  if (!Number.isFinite(scale) || Math.min(lu, lv) <= minimumLeg) {
    return unavailable(
      'Repeated points or a leg unresolved at this coordinate scale.',
    );
  }
  const un = multiply(u, 1 / lu),
    vn = multiply(v, 1 / lv);
  const normal = cross(un, vn),
    sine = length(normal);
  if (type === MeasurementType.Angle) {
    return {
      state: MeasurementState.Available,
      angleDegrees: (Math.atan2(sine, dot(un, vn)) * 180) / Math.PI,
    };
  }
  if (sine <= MeasurementPolicy.minimumCircleSine) {
    return unavailable(
      'Collinear or nearly collinear points: the circle is numerically unstable.',
    );
  }
  const U = multiply(u, 1 / scale),
    V = multiply(v, 1 / scale),
    N = cross(U, V);
  const centreLocal = multiply(
    add(multiply(cross(V, N), dot(U, U)), multiply(cross(N, U), dot(V, V))),
    1 / (2 * dot(N, N)),
  );
  const centre = add(a, multiply(centreLocal, scale));
  const radius = length(centreLocal) * scale;
  if (![...centre, radius, radius * 2].every(Number.isFinite)) {
    return unavailable('Circle exceeds the supported numeric range.');
  }
  const planeNormal = multiply(normal, 1 / sine);
  const axisU = multiply(centreLocal, -scale / radius);
  return {
    state: MeasurementState.Available,
    centre,
    radius,
    diameter: radius * 2,
    normal: planeNormal,
    axisU,
    axisV: cross(planeNormal, axisU),
  };
}
export function unitToMm(unit: string): number | null {
  switch (unit) {
    case LengthUnit.Mm:
      return 1;
    case LengthUnit.Cm:
      return 10;
    case LengthUnit.Inch:
      return 25.4;
    default:
      return null;
  }
}
export function createMeasurementEntry(
  id: string,
  name: string,
  type: MeasurementType,
  points: readonly MeasurementPoint[],
  context: MeasurementContext,
  assumption: string,
  displayUnit: string,
): MeasurementEntry {
  const isBuild = context.format === MeasurementFormat.ThreeMf;
  const factor = isBuild ? 1 : unitToMm(assumption);
  const placedItemIds = [
    ...new Set(points.flatMap((p) => (p.placedItemId ? [p.placedItemId] : []))),
  ];
  return {
    id,
    name: name.slice(0, MeasurementPolicy.maxNameLength),
    type,
    points: points.map((p) => ({ ...p, coordinates: [...p.coordinates] })),
    result: calculateMeasurement(
      type,
      points.map((p) => p.coordinates),
    ),
    frame: isBuild
      ? 'resolved 3MF build coordinates in millimetres'
      : 'STL source coordinates restored from displayed Float32 mesh',
    sourceUnit: isBuild ? context.declaredUnit : assumption || 'unknown',
    coordinateToMm: factor,
    resultLengthUnit: isBuild ? 'mm' : 'source coordinate units',
    displayedLengthUnit:
      factor === null
        ? 'coordinate units (physical length unavailable)'
        : displayUnit,
    placedItemIds,
    spansPlacedItems:
      isBuild && points.some((point) => !point.placedItemId)
        ? null
        : placedItemIds.length > 1,
    notes: [
      'Displayed mesh precision; no CAD precision recovery.',
      'Three-point constructions do not establish roundness, clearance or physical fit.',
      ...(isBuild
        ? [
            'Resolved placement coordinates; source unit normalized to mm before display.',
          ]
        : [
            'Changing the STL interpretation recomputes physical lengths; changing display unit only converts them.',
          ]),
    ],
  };
}
export function serializeMeasurements(
  entries: readonly MeasurementEntry[],
): string {
  return JSON.stringify(
    {
      format: 'inspectmesh-measurements',
      version: 1,
      privacy: 'Local record; no source filename or geometry included.',
      entries,
    },
    null,
    2,
  );
}
