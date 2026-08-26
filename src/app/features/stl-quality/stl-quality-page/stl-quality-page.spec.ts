import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { JobsService } from '../../../core/api/jobs.service';
import { StlJobService } from '../../../core/api/stl-job.service';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { Job } from '../../../models/job';
import { HttpErrorResponse } from '@angular/common/http';
import { FILE_TOO_LARGE_MESSAGE } from '../../../core/api/upload-limits';
import { StlQualityPage } from './stl-quality-page';

describe('StlQualityPage', () => {
  const job: Job = {
    id: '0a36659b',
    fileName: 'rotor.stl',
    fileSizeBytes: 11,
    status: 'created',
    createdAt: '2026-08-12T21:08:08Z',
    upload: {
      url: 'https://uploads.example.com/jobs/0a36659b/input.stl?signature=abc',
      method: 'POST',
      fields: { key: 'jobs/0a36659b/input.stl', policy: 'signed-policy' },
      expiresAt: '2026-08-12T21:23:08Z',
    },
  };
  const jobsService = {
    uploadFile: vi.fn(() => of(undefined)),
    getJob: vi.fn(() => of(job)),
  };
  const stlJobs = { create: vi.fn(() => of(job)) };
  const analytics = {
    trackUploadStarted: vi.fn(),
    trackUploadCompleted: vi.fn(),
    trackAnalysisCompleted: vi.fn(),
    trackAnalysisFailed: vi.fn(),
    trackReportDownloaded: vi.fn(),
  };

  beforeEach(() => {
    stlJobs.create.mockReset().mockReturnValue(of(job));
    jobsService.uploadFile.mockReset().mockReturnValue(of(undefined));
    jobsService.getJob.mockReset().mockReturnValue(of(job));
    Object.values(analytics).forEach((method) => method.mockReset());
    TestBed.configureTestingModule({
      imports: [StlQualityPage],
      providers: [
        { provide: JobsService, useValue: jobsService },
        { provide: StlJobService, useValue: stlJobs },
        { provide: AnalyticsService, useValue: analytics },
      ],
    });
  });

  it('creates a job and displays the result', () => {
    const fixture = TestBed.createComponent(StlQualityPage);
    fixture.componentInstance.onFileSelected(
      new File(['solid mesh'], 'rotor.stl'),
    );
    fixture.componentInstance.checkStl();
    fixture.detectChanges();

    expect(stlJobs.create).toHaveBeenCalledWith({
      fileName: 'rotor.stl',
      fileSizeBytes: 10,
    });
    expect(jobsService.uploadFile).toHaveBeenCalledWith(
      job.upload,
      expect.any(File),
    );
    expect(analytics.trackUploadStarted).toHaveBeenCalledWith(
      'quality_check',
      10,
    );
    expect(analytics.trackUploadCompleted).toHaveBeenCalledWith(
      'quality_check',
    );
    expect(fixture.nativeElement.textContent).toContain('Analysing your model');
  });

  it('shows a spinner immediately while the job is being created', () => {
    stlJobs.create.mockReturnValue(NEVER);
    const fixture = TestBed.createComponent(StlQualityPage);
    fixture.componentInstance.onFileSelected(new File(['mesh'], 'rotor.stl'));

    fixture.componentInstance.checkStl();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.submit .spinner'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement
        .querySelector('.submit')
        .classList.contains('is-loading'),
    ).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Creating job…');
  });

  it('does not show a loading state before a file is selected', () => {
    const fixture = TestBed.createComponent(StlQualityPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.submit .spinner')).toBeNull();
    expect(
      fixture.nativeElement
        .querySelector('.submit')
        .classList.contains('is-loading'),
    ).toBe(false);
  });

  it('shows an API failure', () => {
    stlJobs.create.mockReturnValue(throwError(() => new Error('offline')));
    const fixture = TestBed.createComponent(StlQualityPage);
    fixture.componentInstance.onFileSelected(new File(['mesh'], 'rotor.stl'));
    fixture.componentInstance.checkStl();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="alert"]')?.textContent,
    ).toContain('could not create the job or upload');
    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(fixture.nativeElement.querySelector('.submit').disabled).toBe(false);
  });

  it('shows the maximum size for a FILE_TOO_LARGE API error', () => {
    stlJobs.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 413,
            error: { code: 'FILE_TOO_LARGE' },
          }),
      ),
    );
    const fixture = TestBed.createComponent(StlQualityPage);
    fixture.componentInstance.onFileSelected(new File(['mesh'], 'rotor.stl'));
    fixture.componentInstance.checkStl();
    expect(fixture.componentInstance.error()).toBe(FILE_TOO_LARGE_MESSAGE);
    expect(jobsService.uploadFile).not.toHaveBeenCalled();
  });

  it('shows the shared rolling-limit message for RATE_LIMITED', () => {
    stlJobs.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            error: { code: 'RATE_LIMITED', retryAfterSeconds: 120 },
          }),
      ),
    );
    const fixture = TestBed.createComponent(StlQualityPage);
    fixture.componentInstance.onFileSelected(new File(['mesh'], 'rotor.stl'));
    fixture.componentInstance.checkStl();
    expect(fixture.componentInstance.error()).toContain(
      '10 uploads per rolling hour',
    );
    expect(jobsService.getJob).not.toHaveBeenCalled();
  });

  it('shows an upload failure after creating the job', () => {
    jobsService.uploadFile.mockReturnValue(
      throwError(() => new Error('upload failed')),
    );
    const fixture = TestBed.createComponent(StlQualityPage);
    fixture.componentInstance.onFileSelected(new File(['mesh'], 'rotor.stl'));
    fixture.componentInstance.checkStl();
    fixture.detectChanges();

    expect(jobsService.uploadFile).toHaveBeenCalled();
    expect(fixture.componentInstance.job()).toEqual(job);
    expect(
      fixture.nativeElement.querySelector('[role="alert"]')?.textContent,
    ).toContain('could not create the job or upload');
  });

  it('polls until the job completes', async () => {
    vi.useFakeTimers();
    const completed: Job = {
      ...job,
      status: 'completed',
      report: { triangleCount: 12 },
    };
    jobsService.getJob.mockReturnValue(of(completed));
    const fixture = TestBed.createComponent(StlQualityPage);
    fixture.componentInstance.onFileSelected(new File(['mesh'], 'rotor.stl'));
    fixture.componentInstance.checkStl();

    await vi.advanceTimersByTimeAsync(1000);
    fixture.detectChanges();

    expect(jobsService.getJob).toHaveBeenCalledWith(job.id);
    expect(fixture.componentInstance.job()?.status).toBe('completed');
    expect(fixture.nativeElement.textContent).toContain('Problems found');
    expect(fixture.nativeElement.textContent).toContain('Triangles');
    expect(fixture.nativeElement.textContent).not.toContain(
      'Analysing your model',
    );
    expect(analytics.trackAnalysisCompleted).toHaveBeenCalledOnce();

    fixture.componentInstance.refreshStatus();
    expect(analytics.trackAnalysisCompleted).toHaveBeenCalledOnce();
    fixture.destroy();
    vi.useRealTimers();
  });
});
