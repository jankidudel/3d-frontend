import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BatchPage } from './batch-page';
import {
  QueueState,
  ModelUnits,
  checkGeometry,
  collectionAllowance,
} from './mesh-workflows';
import { exampleMesh, MeshExample } from './example-meshes';

describe('batch allowances and portable reports', () => {
  beforeEach(() => {
    localStorage.removeItem('inspectmesh-local-batch-reports-v1');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });
  afterEach(() =>
    localStorage.removeItem('inspectmesh-local-batch-reports-v1'),
  );
  it('enforces the free allowance and fences the larger preview by environment', async () => {
    const fixture = TestBed.createComponent(BatchPage);
    const page = fixture.componentInstance;
    expect(collectionAllowance(false, true)).toBe(3);
    expect(collectionAllowance(true, true)).toBe(20);
    page.preview.set(false);
    expect(page.allowance()).toBe(3);
    await page.process(
      Array.from(
        { length: 4 },
        (_, i) => new File(['not a model'], `${i}.stl`),
      ),
    );
    expect(page.error()).toContain('Choose up to 3 files');
    expect(page.rows()).toEqual([]);
    fixture.detectChanges();
    if (!page.developmentPreview) {
      expect(fixture.nativeElement.textContent).not.toContain(
        'Development-only Pro workflow preview',
      );
    }
  });
  it('exports available, unavailable and failed outcomes distinctly without retaining model bytes', () => {
    const page = TestBed.createComponent(BatchPage).componentInstance;
    const settings = {
      stlUnit: ModelUnits.Millimetres,
      printer: null,
      thicknessThresholdMm: 1.2,
    };
    page.rows.set([
      {
        id: 0,
        name: 'owned-cube.stl',
        state: QueueState.Complete,
        error: '',
        result: checkGeometry(exampleMesh(MeshExample.Cube), settings),
        unit: ModelUnits.Millimetres,
        warnings: [],
        durationMs: 1,
      },
      {
        id: 1,
        name: 'owned-open.stl',
        state: QueueState.Complete,
        error: '',
        result: checkGeometry(exampleMesh(MeshExample.Open), settings),
        unit: ModelUnits.Millimetres,
        warnings: [],
        durationMs: 1,
      },
      {
        id: 2,
        name: '=untrusted-name.stl',
        state: QueueState.Failed,
        error: 'Malformed mesh',
        result: null,
        unit: '',
        warnings: [],
        durationMs: 1,
      },
    ]);
    const report = JSON.parse(page.report());
    expect(report.schema).toBe('inspectmesh-mesh-check-1');
    expect(report.distanceUnit).toBe('mm');
    expect(report.files[0].result.topology.volume).toBeCloseTo(8000);
    expect(report.files[1].result.topology.volume).toBeNull();
    expect(report.files[2].state).toBe(QueueState.Failed);
    expect(report.files[2].result).toBeNull();
    expect(page.report()).not.toContain('positions');
    expect(page.report()).not.toContain('indices');
    page.save();
    expect(
      JSON.parse(localStorage.getItem('inspectmesh-local-batch-reports-v1')!),
    ).toHaveLength(1);
    page.clearHistory();
    expect(
      localStorage.getItem('inspectmesh-local-batch-reports-v1'),
    ).toBeNull();
  });
});
