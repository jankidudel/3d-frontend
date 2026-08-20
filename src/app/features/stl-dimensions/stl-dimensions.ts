export type ModelUnit = 'mm' | 'cm' | 'm' | 'in';
export type DimensionAxis = 'width' | 'height' | 'depth';

export interface ModelDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface ScaleResult {
  factor: number;
  percentage: number;
  dimensions: ModelDimensions;
}

export const MODEL_UNITS: readonly ModelUnit[] = ['mm', 'cm', 'm', 'in'];

const MILLIMETRES_PER_UNIT: Record<ModelUnit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
  in: 25.4,
};

export function convertLength(
  value: number,
  from: ModelUnit,
  to: ModelUnit,
): number {
  return (value * MILLIMETRES_PER_UNIT[from]) / MILLIMETRES_PER_UNIT[to];
}

export function calculateScale(
  dimensions: ModelDimensions,
  modelUnit: ModelUnit,
  targetAxis: DimensionAxis,
  desiredSize: number,
  desiredUnit: ModelUnit,
): ScaleResult | null {
  const sourceSize = dimensions[targetAxis];
  if (
    !validDimensions(dimensions) ||
    !Number.isFinite(desiredSize) ||
    desiredSize <= 0 ||
    sourceSize <= 0
  ) {
    return null;
  }

  const desiredInModelUnits = convertLength(
    desiredSize,
    desiredUnit,
    modelUnit,
  );
  const factor = desiredInModelUnits / sourceSize;
  const resultingDimensions = {
    width: convertLength(dimensions.width * factor, modelUnit, desiredUnit),
    height: convertLength(dimensions.height * factor, modelUnit, desiredUnit),
    depth: convertLength(dimensions.depth * factor, modelUnit, desiredUnit),
  };

  if (
    !Number.isFinite(factor) ||
    factor <= 0 ||
    !validDimensions(resultingDimensions)
  ) {
    return null;
  }

  return {
    factor,
    percentage: factor * 100,
    dimensions: resultingDimensions,
  };
}

function validDimensions(dimensions: ModelDimensions): boolean {
  return Object.values(dimensions).every(
    (value) => Number.isFinite(value) && value >= 0,
  );
}
