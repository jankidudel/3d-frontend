import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { JobsService } from '../../core/api/jobs.service';
import { StlJobService } from '../../core/api/stl-job.service';
import { SeoService } from '../../core/seo/seo.service';
import { Job, JobStatus } from '../../models/job';
import { MeshQualityPdfService } from '../../shared/mesh-quality-pdf.service';
import { binaryFixture, cubeTriangles } from '../stl-repair/parts-fixtures';
import {
  SplitFailureCode,
  splitFailureMessage,
  StlSplitterPage,
} from './stl-splitter-page';

describe('StlSplitterPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StlSplitterPage],
      providers: [
        provideRouter([]),
        { provide: AnalyticsService, useValue: { trackSplitter: vi.fn() } },
        { provide: JobsService, useValue: { getJob: vi.fn() } },
        { provide: StlJobService, useValue: { create: vi.fn() } },
        { provide: MeshQualityPdfService, useValue: { download: vi.fn() } },
        { provide: SeoService, useValue: { apply: vi.fn() } },
      ],
    });
  });

  it('groups successful split report downloads in the shared report-actions layout', () => {
    const fixture = TestBed.createComponent(StlSplitterPage);
    fixture.componentInstance['job'].set(completedSplitJob());
    fixture.detectChanges();

    const actions = fixture.nativeElement.querySelector('.report-actions');
    expect(actions).not.toBeNull();
    expect(actions.tagName).toBe('DIV');
    expect(actions.querySelectorAll('.button')).toHaveLength(2);
  });

  it('calculates a percentage from the source minimum for shifted bounds', () => {
    const fixture = TestBed.createComponent(StlSplitterPage);
    fixture.componentInstance.bounds.set({
      X: { min: 0, max: 20 },
      Y: { min: 0, max: 20 },
      Z: { min: -5, max: 15 },
    });

    expect(fixture.componentInstance.coordinate()).toBe(5);
  });

  it('invalidates a prior result when a cut input changes', () => {
    const fixture = TestBed.createComponent(StlSplitterPage);
    fixture.componentInstance.job.set(completedSplitJob());

    fixture.componentInstance.setPosition(55);

    expect(fixture.componentInstance.job()).toBeNull();
  });

  it('reads shifted source bounds before centering display geometry', async () => {
    const page = TestBed.createComponent(StlSplitterPage).componentInstance;
    await page.loadExample([
      new File(
        [binaryFixture(cubeTriangles(20, [230, 20, -5]))],
        'shifted.stl',
      ),
    ]);
    expect(page.bounds()?.Z).toEqual({ min: -5, max: 15 });
    expect(page.bounds()?.X).toEqual({ min: 230, max: 250 });
    expect(page.coordinate()).toBe(5);
    expect(TestBed.inject(StlJobService).create).not.toHaveBeenCalled();
    page.setPosition(0);
    expect(page.coordinate()).toBe(-5);
    expect(page.canSplit()).toBe(false);
    page.setPosition(100);
    expect(page.coordinate()).toBe(15);
    expect(page.canSplit()).toBe(false);
  });

  it('ignores a slow refresh after inputs change and a new result is selected', () => {
    const oldResponse = new Subject<Job>();
    vi.mocked(TestBed.inject(JobsService).getJob).mockReturnValue(oldResponse);
    const page = TestBed.createComponent(StlSplitterPage).componentInstance;
    page.job.set(completedSplitJob());
    page.refresh();
    page.setAxis('X');
    const newJob = { ...completedSplitJob(), id: 'new-job' };
    page.job.set(newJob);
    oldResponse.next(completedSplitJob());
    expect(page.job()).toBe(newJob);
  });

  it('prevents duplicate submission and discards a cancelled upload completion', () => {
    const created = new Subject<Job>();
    const service = TestBed.inject(StlJobService);
    vi.mocked(service.create).mockReturnValue(created);
    const page = TestBed.createComponent(StlSplitterPage).componentInstance;
    page.file.set(new File(['fixture'], 'cube.stl'));
    page.bounds.set({
      X: { min: 0, max: 20 },
      Y: { min: 0, max: 20 },
      Z: { min: 0, max: 20 },
    });
    page.split();
    page.split();
    expect(service.create).toHaveBeenCalledOnce();
    page.setPosition(60);
    created.next(completedSplitJob());
    expect(page.job()).toBeNull();
    expect(page.submitting()).toBe(false);
  });

  it('reveals a terminal result when refreshing after polling timeout', () => {
    vi.mocked(TestBed.inject(JobsService).getJob).mockReturnValue(
      of(completedSplitJob()),
    );
    const page = TestBed.createComponent(StlSplitterPage).componentInstance;
    page.job.set({ ...completedSplitJob(), status: JobStatus.Processing });
    page.timedOut.set(true);
    page.refresh();
    expect(page.timedOut()).toBe(false);
    expect(page.job()?.status).toBe(JobStatus.Completed);
  });

  it('maps only real service failure codes and keeps an unknown server message', () => {
    expect(
      splitFailureMessage({
        ...completedSplitJob(),
        status: JobStatus.Failed,
        report: undefined,
        failure: {
          error: { code: SplitFailureCode.GeometryRejected },
        },
      }),
    ).toContain('capped safely');
    expect(
      splitFailureMessage({
        ...completedSplitJob(),
        status: JobStatus.Failed,
        report: undefined,
        failure: {
          error: { code: 'unknown_transport', message: 'Gateway unavailable' },
        },
      }),
    ).toBe('Gateway unavailable');
  });
});

function completedSplitJob(): Job {
  return {
    id: 'split-job',
    fileName: 'model.stl',
    fileSizeBytes: 1,
    status: JobStatus.Completed,
    createdAt: '2026-09-05T00:00:00Z',
    report: {
      split: {
        axis: 'Z',
        positionPercent: 50,
        positionCoordinate: 0.5,
        partA: part('model-part-a.stl'),
        partB: part('model-part-b.stl'),
      },
    } as never,
  };
}

function part(fileName: string) {
  return {
    fileName,
    triangleCount: 4,
    dimensions: { width: 1, height: 1, depth: 1 },
    boundingBox: {
      minX: 0,
      minY: 0,
      minZ: 0,
      maxX: 1,
      maxY: 1,
      maxZ: 1,
    },
    validation: {
      isValid: true,
      isWatertight: true,
      isManifold: true,
      connectedComponentCount: 1,
    },
  };
}
