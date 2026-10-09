import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import { BatchPage, ReportFormat } from './batch-page';
import { MeshWorkerRequest, MeshWorkerMode } from './mesh-worker';
import {
  checkGeometry,
  QueueState,
  ModelUnits,
  collectionAllowance,
} from './mesh-workflows';
import { exampleFile, exampleMesh, MeshExample } from './example-meshes';
const failed = () => new File(['malformed'], 'bad.stl');
let page: BatchPage;
beforeEach(() => {
  localStorage.clear();
  TestBed.configureTestingModule({
    imports: [BatchPage],
    providers: [
      provideRouter([]),
      { provide: AnalyticsService, useValue: { trackWorkflow: vi.fn() } },
      { provide: SeoService, useValue: { apply: vi.fn() } },
    ],
  });
  page = TestBed.createComponent(BatchPage).componentInstance;
  vi.stubGlobal(
    'Worker',
    class {
      onmessage?: (event: MessageEvent) => void;
      postMessage(request: MeshWorkerRequest): void {
        queueMicrotask(() => {
          if (request.mode === MeshWorkerMode.Check) {
            this.onmessage?.({
              data: {
                check: checkGeometry(
                  request.mesh,
                  request.settings,
                  request.scale,
                ),
              },
            } as MessageEvent);
          }
        });
      }
      terminate(): void {}
    },
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('counts failures, reruns and replacement while retaining other results', async () => {
  await page.process([
    failed(),
    exampleFile(MeshExample.Cube),
    exampleFile(MeshExample.Open),
  ]);
  expect(page.status()).toBe('3 of 3 processed - 2 completed, 1 failed.');
  const bad = page.rows().find((row) => row.state === QueueState.Failed)!;
  const other = page.rows().find((row) => row.state === QueueState.Complete)!;
  await page.rerun(bad.id);
  expect(page.rows().find((row) => row.id === other.id)).toBe(other);
  expect(page.status()).toBe('3 of 3 processed - 2 completed, 1 failed.');
  const input = document.createElement('input');
  Object.defineProperty(input, 'files', {
    value: [exampleFile(MeshExample.Cube)],
  });
  await page.replaceFile(bad.id, { target: input } as unknown as Event);
  expect(page.status()).toBe('3 of 3 processed - 3 completed, 0 failed.');
  expect(page.rows().find((row) => row.id === other.id)).toBe(other);
});
it('finishes all-failed collections and cancels pending work explicitly', async () => {
  await page.process([failed(), failed()]);
  expect(page.status()).toBe('2 of 2 processed - 0 completed, 2 failed.');
  const processing = page.process([
    exampleFile(MeshExample.Cube),
    exampleFile(MeshExample.Open),
  ]);
  page.cancel();
  await processing;
  expect(page.status()).toBe(
    '0 of 2 processed - 0 completed, 0 failed. 2 cancelled without a completed result.',
  );
});
it('downloads complete JSON and CSV blobs despite filtering', async () => {
  await page.process([failed(), exampleFile(MeshExample.Cube)]);
  page.filter.set(page.filters.Failed);
  expect(page.visible()).toHaveLength(1);
  const blobs: Blob[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    blobs.push(blob as Blob);
    return 'blob:report';
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
    () => undefined,
  );
  page.export(ReportFormat.Json);
  page.export(ReportFormat.Csv);
  const report = JSON.parse(await blobs[0].text());
  expect(report.files).toHaveLength(2);
  expect(report.progress).toMatchObject({ processed: 2, failed: 1 });
  expect(await blobs[1].text()).toContain(
    report.files.find(
      (row: { state: string }) => row.state === QueueState.Failed,
    ).error,
  );
  expect(await blobs[1].text()).toContain('closed-20mm-cube.stl');
  expect(page.savedMessage()).toContain('all 2 inputs');
});

it('enforces the free allowance and fences the larger preview by environment', async () => {
  expect(collectionAllowance(false, true)).toBe(3);
  expect(collectionAllowance(true, true)).toBe(20);
  page.preview.set(false);
  expect(page.allowance()).toBe(3);
  await page.process(
    Array.from({ length: 4 }, (_, i) => new File(['not a model'], `${i}.stl`)),
  );
  expect(page.error()).toContain('Choose up to 3 files');
  expect(page.rows()).toEqual([]);
});
it('exports available, unavailable and failed outcomes distinctly without retaining model bytes', () => {
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
  expect(localStorage.getItem('inspectmesh-local-batch-reports-v1')).toBeNull();
});
