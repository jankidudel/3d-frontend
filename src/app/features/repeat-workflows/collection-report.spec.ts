import {
  collectionCsv,
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
