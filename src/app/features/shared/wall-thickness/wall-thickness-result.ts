import { WallThicknessReport } from './wall-thickness-model';

export const WallThicknessOutcomeText = {
  ThinAreas: 'Sampled areas below your threshold',
  UnmeasuredAreas: 'Some sampled locations could not be measured',
  NoThinAreas: 'No measured samples below your threshold',
  NoMeasurements: 'No wall estimate available',
} as const;

export function wallThicknessOutcomeText(report: WallThicknessReport): string {
  if (report.measured === 0) {
    return WallThicknessOutcomeText.NoMeasurements;
  }
  if (report.belowThreshold > 0) {
    return WallThicknessOutcomeText.ThinAreas;
  }
  if (report.unmeasured > 0) {
    return WallThicknessOutcomeText.UnmeasuredAreas;
  }
  return WallThicknessOutcomeText.NoThinAreas;
}
export function roundedThickness(value: number | null): string {
  if (value === null) {
    return 'Not measured';
  }
  return Math.abs(value) < 0.01 && value !== 0
    ? value.toPrecision(2)
    : value.toFixed(2);
}

export function wallThicknessNextAction(report: WallThicknessReport): string {
  if (report.measured === 0) {
    return 'Check units, mesh geometry and the method limits before relying on a thickness value.';
  }
  if (report.belowThreshold > 0) {
    return 'Inspect the marked geometry in CAD and compare the same region with sliced paths.';
  }
  return 'Review unmeasured locations and critical features that finite sampling may miss.';
}
