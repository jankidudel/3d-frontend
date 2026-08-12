import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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
  };
  const jobsService = {
    createJob: vi.fn(() => of(job)),
    getJob: vi.fn(() => of(job)),
  };

  beforeEach(() => {
    jobsService.createJob.mockReset().mockReturnValue(of(job));
    jobsService.getJob.mockReset().mockReturnValue(of(job));
    TestBed.configureTestingModule({
      imports: [StlQualityPage],
      providers: [{ provide: JobsService, useValue: jobsService }],
    });
  });

  it('creates a job and displays the result', () => {
    const fixture = TestBed.createComponent(StlQualityPage);
    fixture.componentInstance.onFileSelected(new File(['solid mesh'], 'rotor.stl'));
    fixture.componentInstance.checkStl();
    fixture.detectChanges();

    expect(jobsService.createJob).toHaveBeenCalledWith({
      fileName: 'rotor.stl',
      fileSizeBytes: 10,
    });
    expect(fixture.nativeElement.textContent).toContain('Job created');
    expect(fixture.nativeElement.textContent).toContain('0a36659b');
  });

  it('shows an API failure', () => {
    jobsService.createJob.mockReturnValue(throwError(() => new Error('offline')));
    const fixture = TestBed.createComponent(StlQualityPage);
    fixture.componentInstance.onFileSelected(new File(['mesh'], 'rotor.stl'));
    fixture.componentInstance.checkStl();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'could not create',
    );
  });
});
