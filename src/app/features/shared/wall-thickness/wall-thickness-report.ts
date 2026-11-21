import { WallThicknessReport } from './wall-thickness-model';
export function wallThicknessReportJson(report: WallThicknessReport): Blob {
  return new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json',
  });
}
