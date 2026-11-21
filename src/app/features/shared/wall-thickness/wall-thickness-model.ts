/**
 * Wall-thickness types, units and sampling helpers without three.js, so pages
 * can use them before the measurement engine is downloaded.
 */
export interface IndexedTriangleGeometry {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
}
export const WallThicknessUnit = {
  Millimetres: 'mm',
  Centimetres: 'cm',
  Inches: 'inches',
} as const;
export type WallThicknessUnit =
  (typeof WallThicknessUnit)[keyof typeof WallThicknessUnit];
export const MAX_WALL_THICKNESS_SAMPLES = 2_000;
const MILLIMETRES_PER_UNIT: Readonly<Record<WallThicknessUnit, number>> = {
  mm: 1,
  cm: 10,
  inches: 25.4,
};
export interface ThicknessSample {
  readonly triangle: number;
  readonly thickness: number | null;
}
export interface WallThicknessReport {
  readonly samples: readonly ThicknessSample[];
  readonly measured: number;
  readonly unmeasured: number;
  readonly belowThreshold: number;
  readonly minimum: number | null;
  readonly average: number | null;
  readonly threshold: number;
  readonly unit: WallThicknessUnit;
}
export function unitMultiplier(
  from: WallThicknessUnit,
  to: WallThicknessUnit,
): number {
  return MILLIMETRES_PER_UNIT[from] / MILLIMETRES_PER_UNIT[to];
}
export function validThreshold(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
/** Uniformly spreads a bounded number of samples over the input triangle order. */
export function sampleTriangleIndices(
  triangleCount: number,
  maximum = MAX_WALL_THICKNESS_SAMPLES,
): number[] {
  if (!Number.isInteger(triangleCount) || triangleCount <= 0 || maximum <= 0) {
    return [];
  }
  const count = Math.min(triangleCount, Math.floor(maximum));
  return Array.from({ length: count }, (_, index) =>
    Math.floor((index * triangleCount) / count),
  );
}
