import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { JobsService } from '../../../core/api/jobs.service';
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

  beforeEach(() => {
    jobsService.createJob.mockReset().mockReturnValue(of(job));
    jobsService.uploadFile.mockReset().mockReturnValue(of(undefined));
    jobsService.getJob.mockReset().mockReturnValue(of(job));
    TestBed.configureTestingModule({
      imports: [StlQualityPage],
      providers: [{ provide: JobsService, useValue: jobsService }],
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
    expect(fixture.nativeElement.textContent).toContain('Job created');
    expect(fixture.nativeElement.textContent).toContain('0a36659b');
    expect(fixture.nativeElement.textContent).toContain('Checking STL…');
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
    expect(fixture.nativeElement.textContent).toContain('Quality report');
    expect(fixture.nativeElement.textContent).not.toContain('Checking STL…');
    fixture.destroy();
    vi.useRealTimers();
  });
});
