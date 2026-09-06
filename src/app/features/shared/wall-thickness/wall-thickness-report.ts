import { WallThicknessReport } from './wall-thickness-analysis';
export function wallThicknessReportJson(report: WallThicknessReport): Blob {
  return new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json',
  });
}
