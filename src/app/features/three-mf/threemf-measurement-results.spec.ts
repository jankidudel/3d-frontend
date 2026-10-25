import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { JobsService } from '../../core/api/jobs.service';
import { JobCreationService } from '../../core/api/job-creation.service';
import { Job, JobStatus } from '../../models/job';
import { ThreeMfVolumePage } from './threemf-volume-page';
import { ThreeMfTrianglePage } from './threemf-triangle-page';

const completedJob: Job = {
  id: 'measurement',
  fileName: 'control.3mf',
  fileSizeBytes: 1024,
  status: JobStatus.Completed,
  createdAt: '2026-10-25T20:00:00Z',
};

describe('3MF measurement result availability', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: {} },
        { provide: JobCreationService, useValue: {} },
      ],
    });
  });

  it('withholds mass for missing volume and supports a real zero', () => {
    const fixture = TestBed.createComponent(ThreeMfVolumePage);
    const page = fixture.componentInstance;
    page.job.set({
      ...completedJob,
      report: { sourceUnit: 'millimeter', volume: null },
    });
    fixture.detectChanges();
    expect(page.weight()).toBeNull();
    expect(
      fixture.nativeElement.querySelector('input[type="number"]').disabled,
    ).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Volume unavailable');
    page.job.set({
      ...completedJob,
      report: { sourceUnit: 'millimeter', volume: 0 },
    });
    fixture.detectChanges();
    expect(page.weight()).toBe(0);
    expect(
      fixture.nativeElement.querySelector('input[type="number"]').disabled,
    ).toBe(false);
    page.density.set(Number.NaN);
    fixture.detectChanges();
    expect(page.weight()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Mass unavailable.');
  });

  it('converts declared cubic units before calculating mass', () => {
    const page = TestBed.createComponent(ThreeMfVolumePage).componentInstance;
    page.job.set({
      ...completedJob,
      report: { sourceUnit: 'inch', volume: 1 },
    });
    expect(page.volumeCm3()).toBeCloseTo(16.387064);
    expect(page.weight()).toBeCloseTo(20.31995936);
    page.job.set({
      ...completedJob,
      report: { sourceUnit: 'inch', volume: -1 },
    });
    expect(page.weight()).toBeNull();
  });

  it('shows missing and failed counts separately from a valid zero', () => {
    const fixture = TestBed.createComponent(ThreeMfTrianglePage);
    const page = fixture.componentInstance;
    for (const report of [
      undefined,
      {},
      { triangleCount: null },
      { triangleCount: -1 },
    ]) {
      page.job.set({ ...completedJob, report });
      fixture.detectChanges();
      expect(page.triangleCount()).toBeNull();
      expect(fixture.nativeElement.textContent).toContain(
        'Triangle count unavailable',
      );
      expect(fixture.nativeElement.querySelector('.primary')).toBeNull();
    }
    page.job.set({ ...completedJob, report: { triangleCount: 0 } });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.primary h2').textContent.trim(),
    ).toBe('0');
    page.job.set({ ...completedJob, status: JobStatus.Failed });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'We couldn’t analyse this 3MF file',
    );
    expect(fixture.nativeElement.querySelector('.primary')).toBeNull();
  });
});
