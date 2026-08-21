import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { JobsService } from '../../../core/api/jobs.service';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { Job } from '../../../models/job';
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
    createJob: vi.fn(() => of(job)),
    uploadFile: vi.fn(() => of(undefined)),
    getJob: vi.fn(() => of(job)),
  };
  const analytics = {
    trackUploadStarted: vi.fn(),
    trackUploadCompleted: vi.fn(),
    trackAnalysisCompleted: vi.fn(),
    trackAnalysisFailed: vi.fn(),
    trackReportDownloaded: vi.fn(),
  };

  beforeEach(() => {
    jobsService.createJob.mockReset().mockReturnValue(of(job));
    jobsService.uploadFile.mockReset().mockReturnValue(of(undefined));
    jobsService.getJob.mockReset().mockReturnValue(of(job));
    Object.values(analytics).forEach((method) => method.mockReset());
    TestBed.configureTestingModule({
      imports: [StlQualityPage],
      providers: [
        { provide: JobsService, useValue: jobsService },
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

    expect(jobsService.createJob).toHaveBeenCalledWith({
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
    jobsService.createJob.mockReturnValue(NEVER);
    const fixture = TestBed.createComponent(StlQualityPage);
    fixture.componentInstance.onFileSelected(new File(['mesh'], 'rotor.stl'));

    fixture.componentInstance.checkStl();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.submit .spinner'),
    ).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Creating job…');
  });

  it('shows an API failure', () => {
    jobsService.createJob.mockReturnValue(
      throwError(() => new Error('offline')),
    );
    const fixture = TestBed.createComponent(StlQualityPage);
    fixture.componentInstance.onFileSelected(new File(['mesh'], 'rotor.stl'));
    fixture.componentInstance.checkStl();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="alert"]')?.textContent,
    ).toContain('could not create the job or upload');
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
