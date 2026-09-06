import { StlMesh } from '../stl-reducer/stl-reducer';

export const ScaleUnit = {
  Millimetres: 'mm',
  Centimetres: 'cm',
  Inches: 'inches',
} as const;

export type ScaleUnit = (typeof ScaleUnit)[keyof typeof ScaleUnit];
export type ScaleDimension = 'width' | 'depth' | 'height';

const MILLIMETRES_PER_UNIT: Record<ScaleUnit, number> = {
  [ScaleUnit.Millimetres]: 1,
  [ScaleUnit.Centimetres]: 10,
  [ScaleUnit.Inches]: 25.4,
};

export interface ScaleDimensions {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
}

export function dimensionsOf(mesh: StlMesh): ScaleDimensions | null {
  const bounds = boundsOf(mesh);
  if (!bounds) {
    return null;
  }
  const dimensions = {
    width: bounds.maxX - bounds.minX,
    depth: bounds.maxY - bounds.minY,
    height: bounds.maxZ - bounds.minZ,
  };
  return Object.values(dimensions).every(
    (value) => Number.isFinite(value) && value > 0,
  )
    ? dimensions
    : null;
}

interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly maxZ: number;
}

function boundsOf(mesh: StlMesh): Bounds | null {
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
  return [minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)
    ? { minX, minY, minZ, maxX, maxY, maxZ }
    : null;
}

export function percentageScale(percentage: number): number | null {
  return Number.isFinite(percentage) && percentage > 0
    ? percentage / 100
    : null;
}

export function targetDimensionScale(
  dimensions: ScaleDimensions,
  dimension: ScaleDimension,
  target: number,
  unit: ScaleUnit,
): number | null {
  const current = dimensions[dimension];
  const targetInMillimetres = target * MILLIMETRES_PER_UNIT[unit];
  return Number.isFinite(targetInMillimetres) &&
    targetInMillimetres > 0 &&
    current > 0
    ? targetInMillimetres / current
    : null;
}

export function unitConversionScale(
  source: ScaleUnit,
  target: ScaleUnit,
): number {
  return MILLIMETRES_PER_UNIT[source] / MILLIMETRES_PER_UNIT[target];
}

export function scaleDimensions(
  dimensions: ScaleDimensions,
  factor: number,
  unit: ScaleUnit,
): ScaleDimensions | null {
  const converted = {
    width: (dimensions.width * factor) / MILLIMETRES_PER_UNIT[unit],
    depth: (dimensions.depth * factor) / MILLIMETRES_PER_UNIT[unit],
    height: (dimensions.height * factor) / MILLIMETRES_PER_UNIT[unit],
  };
  return Object.values(converted).every(
    (value) => Number.isFinite(value) && value > 0,
  )
    ? converted
    : null;
}

export function scaleMesh(mesh: StlMesh, factor: number): StlMesh | null {
  if (!Number.isFinite(factor) || factor <= 0) {
    return null;
  }
  const bounds = boundsOf(mesh);
  if (!bounds) {
    return null;
  }
  const positions = mesh.positions.slice();
  const centre = [
    (bounds.minX + bounds.maxX) / 2,
    (bounds.minY + bounds.maxY) / 2,
    (bounds.minZ + bounds.maxZ) / 2,
  ];
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] = centre[0] + (positions[index] - centre[0]) * factor;
    positions[index + 1] =
      centre[1] + (positions[index + 1] - centre[1]) * factor;
    positions[index + 2] =
      centre[2] + (positions[index + 2] - centre[2]) * factor;
  }
  return { ...mesh, positions };
}
