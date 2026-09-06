import { WallThicknessReport } from './wall-thickness-analysis';

export const WallThicknessOutcomeText = {
  ThinAreas: 'Thin areas were found',
  UnmeasuredAreas: 'Analysis completed with unmeasured areas',
  NoThinAreas: 'No sampled walls were below your threshold',
} as const;

export function wallThicknessOutcomeText(report: WallThicknessReport): string {
  if (report.belowThreshold > 0) {
    return WallThicknessOutcomeText.ThinAreas;
  }
  if (report.unmeasured > 0) {
    return WallThicknessOutcomeText.UnmeasuredAreas;
  }
  return WallThicknessOutcomeText.NoThinAreas;
}
export function roundedThickness(value: number | null): string {
  return value === null ? 'Not measured' : value.toFixed(2);
}
