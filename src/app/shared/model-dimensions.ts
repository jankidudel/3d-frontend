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

export interface DimensionFit {
  model: number;
  limit: number;
  exceededBy: number;
  fits: boolean;
}

export interface BuildVolumeFitResult {
  fits: boolean;
  dimensions: Record<DimensionAxis, DimensionFit>;
  maximumScaleFactor: number;
  maximumScalePercentage: number;
  scaledDimensions: ModelDimensions;
}

export interface RotationFitResult {
  readonly dimensions: ModelDimensions;
  readonly axisSources: Record<DimensionAxis, DimensionAxis>;
  readonly fit: BuildVolumeFitResult;
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

export function calculateBuildVolumeFit(
  modelDimensions: ModelDimensions,
  modelUnit: ModelUnit,
  buildVolume: ModelDimensions,
  buildUnit: ModelUnit,
): BuildVolumeFitResult | null {
  if (
    !positiveDimensions(modelDimensions) ||
    !positiveDimensions(buildVolume)
  ) {
    return null;
  }

  const modelInBuildUnit = convertDimensions(
    modelDimensions,
    modelUnit,
    buildUnit,
  );
  if (!positiveDimensions(modelInBuildUnit)) {
    return null;
  }

  const dimensions = {
    width: compareDimension(modelInBuildUnit.width, buildVolume.width),
    height: compareDimension(modelInBuildUnit.height, buildVolume.height),
    depth: compareDimension(modelInBuildUnit.depth, buildVolume.depth),
  };
  const maximumScaleFactor = Math.min(
    buildVolume.width / modelInBuildUnit.width,
    buildVolume.height / modelInBuildUnit.height,
    buildVolume.depth / modelInBuildUnit.depth,
  );
  const scaledDimensions = {
    width: modelInBuildUnit.width * maximumScaleFactor,
    height: modelInBuildUnit.height * maximumScaleFactor,
    depth: modelInBuildUnit.depth * maximumScaleFactor,
  };

  if (
    !Number.isFinite(maximumScaleFactor) ||
    maximumScaleFactor <= 0 ||
    !positiveDimensions(scaledDimensions)
  ) {
    return null;
  }

  return {
    fits:
      dimensions.width.fits && dimensions.height.fits && dimensions.depth.fits,
    dimensions,
    maximumScaleFactor,
    maximumScalePercentage: maximumScaleFactor * 100,
    scaledDimensions,
  };
}

/** Evaluates the unique axis permutations produced by right-angle rotations. */
export function calculateRightAngleRotationFits(
  modelDimensions: ModelDimensions,
  modelUnit: ModelUnit,
  buildVolume: ModelDimensions,
  buildUnit: ModelUnit,
): readonly RotationFitResult[] {
  const axes: readonly DimensionAxis[] = ['width', 'height', 'depth'];
  const results: RotationFitResult[] = [];
  const seen = new Set<string>();
  for (const [widthSource, heightSource, depthSource] of permutations(axes)) {
    const dimensions = {
      width: modelDimensions[widthSource],
      height: modelDimensions[heightSource],
      depth: modelDimensions[depthSource],
    };
    const signature = `${dimensions.width}|${dimensions.height}|${dimensions.depth}`;
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    const fit = calculateBuildVolumeFit(
      dimensions,
      modelUnit,
      buildVolume,
      buildUnit,
    );
    if (fit) {
      results.push({
        dimensions: {
          width: fit.dimensions.width.model,
          height: fit.dimensions.height.model,
          depth: fit.dimensions.depth.model,
        },
        axisSources: {
          width: widthSource,
          height: heightSource,
          depth: depthSource,
        },
        fit,
      });
    }
  }
  return results;
}

function permutations<T>(values: readonly T[]): readonly [T, T, T][] {
  return [
    [values[0], values[1], values[2]],
    [values[0], values[2], values[1]],
    [values[1], values[0], values[2]],
    [values[1], values[2], values[0]],
    [values[2], values[0], values[1]],
    [values[2], values[1], values[0]],
  ];
}

function convertDimensions(
  dimensions: ModelDimensions,
  from: ModelUnit,
  to: ModelUnit,
): ModelDimensions {
  return {
    width: convertLength(dimensions.width, from, to),
    height: convertLength(dimensions.height, from, to),
    depth: convertLength(dimensions.depth, from, to),
  };
}

function compareDimension(model: number, limit: number): DimensionFit {
  return {
    model,
    limit,
    exceededBy: Math.max(model - limit, 0),
    fits: model <= limit,
  };
}

function validDimensions(dimensions: ModelDimensions): boolean {
  return Object.values(dimensions).every(
    (value) => Number.isFinite(value) && value >= 0,
  );
}

function positiveDimensions(dimensions: ModelDimensions): boolean {
  return Object.values(dimensions).every(
    (value) => Number.isFinite(value) && value > 0,
  );
}
