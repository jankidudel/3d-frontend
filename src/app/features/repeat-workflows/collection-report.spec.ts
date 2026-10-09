import {
  collectionCsv,
  collectionJson,
  collectionProgress,
  collectionStatus,
  createCollectionReport,
  needsReview,
  QueueEntry,
} from './collection-report';
import { checkGeometry, ModelUnits, QueueState } from './mesh-workflows';
import { exampleMesh, MeshExample } from './example-meshes';
import { ReviewDestination, ReviewSession } from './review-session';
const settings = {
  stlUnit: ModelUnits.Millimetres,
  printer: null,
  thicknessThresholdMm: 1.2,
};
const entry = (kind: MeshExample, id: number): QueueEntry => ({
  id,
  name: `${kind}.stl`,
  state: QueueState.Complete,
  error: '',
  result: checkGeometry(exampleMesh(kind), settings),
  unit: 'mm',
  warnings: [],
  durationMs: 1,
});
describe('customer collection reports', () => {
  it('preserves full independent findings, skipped checks and actions across CSV and JSON', () => {
    const rows = [
      entry(MeshExample.Cube, 0),
      entry(MeshExample.Open, 1),
      {
        ...entry(MeshExample.Cube, 2),
        name: '=evil.stl',
        state: QueueState.Failed,
        error: 'Malformed input',
        result: null,
      },
    ];
    const report = createCollectionReport(
      rows,
      settings,
      '2026-10-07T12:00:00Z',
      ' +SUM(1,1)',
    );
    const csv = collectionCsv(report);
    expect(
      report.files[0].findings.find((f) => f.check === 'Nominal printer fit')
        ?.status,
    ).toBe('skipped');
    expect(report.files[1].result?.topology.volume).toBeNull();
    expect(report.files[2].findings[0].status).toBe('failed');
    expect(csv).toContain("'=evil.stl");
    expect(csv).toContain("'+SUM(1,1)");
    expect(csv).toContain('Malformed input');
    expect(csv).toContain('4 boundary edges');
    expect(csv).toContain(report.method);
    expect(csv).toContain(report.storage);
    expect(JSON.stringify(report)).not.toMatch(/positions|indices|arrayBuffer/);
    expect(report.files.every((row) => row.nextAction.length > 0)).toBe(true);
  });
  it('keeps unresolved shells and cancellation in needs-review rather than clean findings', () => {
    expect(needsReview(entry(MeshExample.Shells, 0))).toBe(true);
    const cancelled = {
      ...entry(MeshExample.Cube, 1),
      state: QueueState.Cancelled,
      result: null,
    };
    const report = createCollectionReport([cancelled], settings, 'date', '');
    expect(needsReview(cancelled)).toBe(true);
    expect(report.files[0].findings[0].status).toBe('cancelled');
    const waiting = { ...cancelled, state: QueueState.Waiting };
    expect(
      createCollectionReport([waiting], settings, 'date', '').files[0]
        .findings[0].status,
    ).toBe('pending');
  });
  it('consumes a handoff once for its intended tool and clears original-file context', () => {
    const session = new ReviewSession();
    const file = new File(['test'], 'sample.stl');
    session.offer(file, ModelUnits.Inches, ReviewDestination.Compare);
    expect(session.take(ReviewDestination.Viewer)).toBeNull();
    expect(session.take(ReviewDestination.Compare)?.file).toBe(file);
    expect(session.take(ReviewDestination.Compare)).toBeNull();
    session.offer(file, ModelUnits.Inches, ReviewDestination.Viewer);
    session.clear();
    expect(session.take(ReviewDestination.Viewer)).toBeNull();
    expect(session.collection).toBeNull();
  });
});

describe('collection terminal counts', () => {
  const failed = {
    ...entry(MeshExample.Cube, 1),
    state: QueueState.Failed,
    result: null,
  };
  it('counts mixed and all-failed inputs as processed', () => {
    expect(
      collectionStatus([
        entry(MeshExample.Cube, 0),
        entry(MeshExample.Open, 2),
        failed,
      ]),
    ).toBe('3 of 3 processed - 2 completed, 1 failed.');
    expect(collectionProgress([failed, { ...failed, id: 2 }])).toMatchObject({
      processed: 2,
      completed: 0,
      failed: 2,
    });
  });
  it('separates cancellation and pending work from successful results', () => {
    expect(
      collectionProgress([
        failed,
        { ...failed, state: QueueState.Cancelled },
        { ...failed, state: QueueState.Waiting },
      ]),
    ).toMatchObject({ processed: 1, cancelled: 1, pending: 1, completed: 0 });
  });
  it('derives counts from current entries after rerun or replacement without accumulating', () => {
    const rows = [entry(MeshExample.Cube, 0), failed];
    const rerun = rows.map((row) =>
      row.id === 1 ? entry(MeshExample.Open, 1) : row,
    );
    expect(rerun[0]).toBe(rows[0]);
    expect(collectionProgress(rerun)).toMatchObject({
      total: 2,
      processed: 2,
      completed: 2,
      failed: 0,
    });
    expect(
      collectionProgress(
        rerun.map((row) =>
          row.id === 1 ? { ...failed, name: 'replacement.stl' } : row,
        ),
      ),
    ).toMatchObject({ total: 2, processed: 2, completed: 1, failed: 1 });
  });
});

it('neutralizes formula prefixes after whitespace or control characters and escapes quoted multiline labels', () => {
  for (const label of [
    '=1+1',
    '+SUM(1,1)',
    '-1+1',
    '@SUM(1)',
    ' \t=1',
    '\u0001\r\n@SUM(1)',
    '\n+1',
  ]) {
    const report = createCollectionReport(
      [{ ...entry(MeshExample.Cube, 0), name: label }],
      settings,
      '2026-10-08',
      label,
    );
    const csv = collectionCsv(report);
    expect(csv).toContain(`"'${label}"`);
  }
  const label = 'Part, "A"\nsecond line';
  const csv = collectionCsv(
    createCollectionReport(
      [{ ...entry(MeshExample.Cube, 0), name: label }],
      settings,
      '2026-10-08',
      '',
    ),
  );
  expect(csv).toContain('"Part, ""A""\nsecond line"');
});

it('rejects nonfinite export values instead of silently turning them into null or spreadsheet text', () => {
  const report = createCollectionReport(
    [{ ...entry(MeshExample.Cube, 0), durationMs: Infinity }],
    settings,
    '2026-10-08',
    '',
  );
  expect(() => collectionJson(report)).toThrow('nonfinite');
});
