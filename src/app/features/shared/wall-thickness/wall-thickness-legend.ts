import type {
  ThicknessSample,
  WallThicknessReport,
} from './wall-thickness-model';

/** Heatmap classes and legend text, usable without loading three.js. */
export const WallThicknessSampleClass = {
  Below: 'below',
  Near: 'near',
  Above: 'above',
  Unmeasured: 'unmeasured',
} as const;
export type WallThicknessSampleClass =
  (typeof WallThicknessSampleClass)[keyof typeof WallThicknessSampleClass];

export const WallThicknessHeatmapColour: Record<
  WallThicknessSampleClass,
  string
> = {
  below: '#c83232',
  near: '#d98a18',
  above: '#16726b',
  unmeasured: '#7b8794',
};

export function classifyWallThicknessSample(
  sample: ThicknessSample,
  threshold: number,
): WallThicknessSampleClass {
  if (sample.thickness === null) {
    return WallThicknessSampleClass.Unmeasured;
  }
  if (sample.thickness < threshold) {
    return WallThicknessSampleClass.Below;
  }
  return sample.thickness < threshold * 1.25
    ? WallThicknessSampleClass.Near
    : WallThicknessSampleClass.Above;
}

export function wallThicknessLegend(report: WallThicknessReport): string {
  return `Red: measured below ${report.threshold} ${report.unit}; orange: measured from the threshold to below ${report.threshold * 1.25} ${report.unit}; blue/green: measured at or above ${report.threshold * 1.25} ${report.unit}; grey: unmeasured sample or triangle not sampled.`;
}
