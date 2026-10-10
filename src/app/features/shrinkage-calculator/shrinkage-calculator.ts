export interface AxisMeasurement {
  readonly designed: number;
  readonly measured: number;
  readonly target: number;
}

export interface ShrinkageAxisResult {
  readonly shrinkagePercent: number;
  readonly scalePercent: number;
  readonly compensatedModelDimension: number;
}

export interface ShrinkageCalculation {
  readonly x: ShrinkageAxisResult | null;
  readonly y: ShrinkageAxisResult | null;
  readonly z: ShrinkageAxisResult | null;
}

export function calculateShrinkageAxis(
  measurement: AxisMeasurement,
): ShrinkageAxisResult | null {
  const { designed, measured, target } = measurement;
  if (
    !Number.isFinite(designed) ||
    !Number.isFinite(measured) ||
    !Number.isFinite(target) ||
    designed <= 0 ||
    measured <= 0 ||
    target <= 0
  ) {
    return null;
  }

  return {
    shrinkagePercent: ((designed - measured) / designed) * 100,
    scalePercent: (designed / measured) * 100,
    compensatedModelDimension: target * (designed / measured),
  };
}

export function calculateShrinkage(
  x: AxisMeasurement,
  y: AxisMeasurement,
  z: AxisMeasurement,
): ShrinkageCalculation {
  const xResult = calculateShrinkageAxis(x);
  const yResult = calculateShrinkageAxis(y);
  const zResult = calculateShrinkageAxis(z);
  return { x: xResult, y: yResult, z: zResult };
}
