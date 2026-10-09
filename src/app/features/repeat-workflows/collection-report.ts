import {
  CheckSettings,
  GeometryCheck,
  QueueState,
  csvCell,
} from './mesh-workflows';

export interface QueueEntry {
  readonly id: number;
  readonly thumbnail?: string | null;
  readonly name: string;
  readonly state: QueueState;
  readonly error: string;
  readonly result: GeometryCheck | null;
  readonly unit: string;
  readonly warnings: readonly string[];
  readonly durationMs: number;
}
export const FindingStatus = {
  Pending: 'pending',
  Review: 'review',
  Complete: 'complete',
  Skipped: 'skipped',
  Failed: 'failed',
  Cancelled: 'cancelled',
} as const;
export type FindingStatus = (typeof FindingStatus)[keyof typeof FindingStatus];
export const FindingSeverity = {
  Information: 'information',
  Warning: 'warning',
  Error: 'error',
} as const;
export interface ReportFinding {
  readonly check: string;
  readonly status: FindingStatus;
  readonly severity: (typeof FindingSeverity)[keyof typeof FindingSeverity];
  readonly detail: string;
}
/** Successful and failed results are processed; cancelled inputs remain unprocessed. */
export function collectionProgress(rows: readonly QueueEntry[]) {
  const completed = rows.filter(
    (row) => row.state === QueueState.Complete,
  ).length;
  const failed = rows.filter((row) => row.state === QueueState.Failed).length;
  const cancelled = rows.filter(
    (row) => row.state === QueueState.Cancelled,
  ).length;
  const pending = rows.length - completed - failed - cancelled;
  return {
    total: rows.length,
    processed: completed + failed,
    completed,
    failed,
    cancelled,
    pending,
  };
}
export function collectionStatus(rows: readonly QueueEntry[]): string {
  const count = collectionProgress(rows);
  return (
    `${count.processed} of ${count.total} processed - ${count.completed} completed, ${count.failed} failed.` +
    (count.cancelled
      ? ` ${count.cancelled} cancelled without a completed result.`
      : '') +
    (count.pending ? ` ${count.pending} pending or processing.` : '')
  );
}
export function needsReview(row: QueueEntry): boolean {
  const r = row.result;
  return (
    row.state !== QueueState.Complete ||
    (!!r &&
      (r.topology.openEdges > 0 ||
        r.topology.nonManifoldEdges > 0 ||
        r.topology.degenerateTriangles > 0 ||
        r.topology.duplicateTriangles > 0 ||
        r.topology.orientationConflicts > 0 ||
        r.topology.shells !== 1 ||
        r.fit === false ||
        (r.thickness?.belowThreshold ?? 0) > 0 ||
        (r.thickness?.unmeasured ?? 0) > 0))
  );
}
export function reportFindings(row: QueueEntry): readonly ReportFinding[] {
  const r = row.result;
  if (!r) {
    return [
      {
        check: 'File processing',
        status:
          row.state === QueueState.Failed
            ? FindingStatus.Failed
            : row.state === QueueState.Cancelled
              ? FindingStatus.Cancelled
              : FindingStatus.Pending,
        severity:
          row.state === QueueState.Failed
            ? FindingSeverity.Error
            : row.state === QueueState.Cancelled
              ? FindingSeverity.Warning
              : FindingSeverity.Information,
        detail:
          row.error ||
          `No geometry result: ${row.state}. Reselect or rerun this file.`,
      },
    ];
  }
  const topologyReview =
    r.topology.openEdges +
      r.topology.nonManifoldEdges +
      r.topology.degenerateTriangles +
      r.topology.duplicateTriangles +
      r.topology.orientationConflicts >
      0 || r.topology.shells !== 1;
  return [
    {
      check: 'Topology',
      status: topologyReview ? FindingStatus.Review : FindingStatus.Complete,
      severity: topologyReview
        ? FindingSeverity.Warning
        : FindingSeverity.Information,
      detail: `${r.topology.openEdges} boundary edges; ${r.topology.nonManifoldEdges} non-manifold edges; ${r.topology.degenerateTriangles} degenerate triangles; ${r.topology.duplicateTriangles} duplicate triangles; ${r.topology.orientationConflicts} winding conflicts; ${r.topology.shells} shells.`,
    },
    {
      check: 'Nominal printer fit',
      status:
        r.fit === null
          ? FindingStatus.Skipped
          : r.fit
            ? FindingStatus.Complete
            : FindingStatus.Review,
      severity:
        r.fit === false ? FindingSeverity.Warning : FindingSeverity.Information,
      detail:
        r.fit === null
          ? 'No printer selected.'
          : r.fit
            ? 'A tested right-angle bounding-box orientation fits. Brims, supports and excluded regions are not reserved.'
            : 'No tested right-angle bounding-box orientation fits.',
    },
    {
      check: 'Wall sampling',
      status: !r.thickness
        ? FindingStatus.Skipped
        : r.thickness.belowThreshold || r.thickness.unmeasured
          ? FindingStatus.Review
          : FindingStatus.Complete,
      severity:
        r.thickness?.belowThreshold || r.thickness?.unmeasured
          ? FindingSeverity.Warning
          : FindingSeverity.Information,
      detail: r.thickness
        ? `${r.thickness.samples} centroid-ray samples; ${r.thickness.belowThreshold} below ${r.thickness.thresholdMm} mm; ${r.thickness.unmeasured} unmeasured. Small features can be missed.`
        : 'No supported wall result.',
    },
    ...r.skipped.map((detail) => ({
      check: 'Method limitation',
      status: FindingStatus.Skipped,
      severity: FindingSeverity.Information,
      detail,
    })),
  ];
}
export function nextAction(row: QueueEntry): string {
  if (!row.result) {
    return 'Check the format, file budget and error; re-export or rerun. No clean finding is implied.';
  }
  return needsReview(row)
    ? 'Inspect the highlighted findings and intended shells; correct a copy in source CAD where needed, compare revisions and recheck in the slicer.'
    : 'Confirm dimensions, design intent and skipped checks, then review the sliced job with the intended printer and material profile.';
}
export function createCollectionReport(
  rows: readonly QueueEntry[],
  settings: CheckSettings | null,
  generatedAt: string,
  reference: string,
) {
  return {
    schema: 'inspectmesh-mesh-check-1',
    methodVersion: 'collection-review-2',
    generatedAt,
    reference: reference.trim(),
    settings,
    progress: collectionProgress(rows),
    status: collectionStatus(rows),
    distanceUnit: 'mm',
    volumeUnit: 'mm³',
    method:
      'Exact-coordinate welding; edge incidence, winding and connected shells; bounded triangle-centroid wall rays; right-angle nominal bounding-box fit.',
    limitations:
      'Self intersections, nested-shell solid interpretation, supports, material behaviour and print success are not checked. No physical print testing is implied.',
    storage:
      'Files processed locally. Original geometry held only in this tab session; optional report history stores labels and findings in this browser, without geometry. No cloud backup.',
    files: rows.map((row) => ({
      ...row,
      format: /\.3mf$/i.test(row.name)
        ? '3MF'
        : /\.stl$/i.test(row.name)
          ? 'STL'
          : 'unsupported',
      findings: reportFindings(row),
      nextAction: nextAction(row),
    })),
  };
}
export type CollectionReport = ReturnType<typeof createCollectionReport>;
export function collectionCsv(report: CollectionReport): string {
  const header = [
    'project_reference',
    'report_date',
    'method_version',
    'method',
    'method_limits',
    'local_processing_and_storage',
    'stl_unit_assumption',
    'file',
    'format',
    'state',
    'declared_or_assumed_unit',
    'triangles',
    'width_mm',
    'height_mm',
    'depth_mm',
    'open_edges',
    'non_manifold_edges',
    'degenerate_triangles',
    'duplicate_triangles',
    'orientation_conflicts',
    'shells',
    'volume_valid',
    'volume_mm3',
    'printer_fit',
    'wall_samples',
    'wall_below_threshold',
    'wall_unmeasured',
    'fit_profile',
    'wall_threshold_mm',
    'findings',
    'warnings',
    'error',
    'next_action',
  ];
  return [
    header,
    ...report.files.map((row) => {
      const r = row.result;
      return [
        report.reference,
        report.generatedAt,
        report.methodVersion,
        report.method,
        report.limitations,
        report.storage,
        report.settings?.stlUnit,
        row.name,
        row.format,
        row.state,
        row.unit,
        r?.triangles,
        r?.dimensionsMm.width,
        r?.dimensionsMm.height,
        r?.dimensionsMm.depth,
        r?.topology.openEdges,
        r?.topology.nonManifoldEdges,
        r?.topology.degenerateTriangles,
        r?.topology.duplicateTriangles,
        r?.topology.orientationConflicts,
        r?.topology.shells,
        r?.topology.volumeReliable,
        r?.topology.volume,
        r?.fit === null ? 'skipped' : r?.fit,
        r?.thickness?.samples,
        r?.thickness?.belowThreshold,
        r?.thickness?.unmeasured,
        report.settings?.printer?.name ?? 'skipped',
        report.settings?.thicknessThresholdMm,
        row.findings
          .map((f) => `${f.check}: ${f.status} (${f.severity}) - ${f.detail}`)
          .join('; '),
        row.warnings.join('; '),
        row.error,
        row.nextAction,
      ];
    }),
  ]
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
}

/** Reject invalid numeric data rather than letting JSON turn it into an ambiguous null. */
export function collectionJson(report: CollectionReport): string {
  return JSON.stringify(
    report,
    (_key, value: unknown) => {
      if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new Error(
          'A nonfinite report value cannot be exported. Rerun the affected file.',
        );
      }
      return value;
    },
    2,
  );
}
