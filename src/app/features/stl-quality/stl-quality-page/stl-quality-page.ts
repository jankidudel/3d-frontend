import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import {
  EMPTY,
  expand,
  finalize,
  Subscription,
  switchMap,
  takeWhile,
  tap,
  throwError,
  timer,
} from 'rxjs';
import { JobsService } from '../../../core/api/jobs.service';
import {
  AnalyticsEventName,
  AnalyticsEventParameters,
  AnalyticsFailureReason,
  AnalyticsService,
  FileSizeBucket,
} from '../../../core/analytics/analytics.service';
import { Job } from '../../../models/job';
import { JobStatusComponent } from '../job-status/job-status';
import { StlFilePicker } from '../stl-file-picker/stl-file-picker';

@Component({
  selector: 'app-stl-quality-page',
  imports: [StlFilePicker, JobStatusComponent],
  templateUrl: './stl-quality-page.html',
  styleUrl: './stl-quality-page.scss',
})
export class StlQualityPage {
  private readonly jobsService = inject(JobsService);
  private readonly analytics = inject(AnalyticsService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  private polling?: Subscription;
  private analyticsParameters: AnalyticsEventParameters = {};
  private readonly trackedEvents = new Set<AnalyticsEventName>();
  readonly selectedFile = signal<File | null>(null);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);
  readonly refreshing = signal(false);
  readonly error = signal('');

  constructor() {
    this.title.setTitle('Free STL Quality Checker – Check 3D Printing Files');
    this.meta.updateTag({
      name: 'description',
      content:
        'Check STL files for common mesh problems including open edges, non-manifold geometry, duplicate triangles and orientation issues.',
    });
    this.destroyRef.onDestroy(() => this.polling?.unsubscribe());
  }

  onFileSelected(file: File | null): void {
    this.polling?.unsubscribe();
    this.selectedFile.set(file);
    this.error.set('');
    this.job.set(null);
    this.trackedEvents.clear();
    this.analyticsParameters = file
      ? {
          file_type: 'stl',
          file_size_bucket: this.fileSizeBucket(file.size),
        }
      : {};
  }

  checkStl(): void {
    const file = this.selectedFile();
    if (!file) {
      this.error.set('Choose a valid STL file before starting the check.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.trackOnce('upload_started');
    this.jobsService
      .createJob({ fileName: file.name, fileSizeBytes: file.size })
      .pipe(
        tap((job) => this.job.set(job)),
        switchMap((job) =>
          job.upload
            ? this.jobsService.uploadFile(job.upload, file)
            : throwError(() => new UploadValidationError()),
        ),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: () => {
          this.trackOnce('upload_completed');
          this.trackOnce('job_processing_started');
          const createdJob = this.job();
          if (createdJob) {
            this.startPolling(createdJob.id);
          }
        },
        error: (error: unknown) => {
          this.trackOnce('upload_failed', {
            reason: this.failureReason(error),
          });
          this.error.set(
            'We could not create the job or upload the file. Please try again.',
          );
        },
      });
  }

  private startPolling(jobId: string): void {
    this.polling?.unsubscribe();
    this.polling = timer(1000)
      .pipe(
        switchMap(() => this.jobsService.getJob(jobId)),
        expand((job, index) =>
          this.isTerminal(job)
            ? EMPTY
            : timer(Math.min(2000 * 2 ** index, 10000)).pipe(
                switchMap(() => this.jobsService.getJob(jobId)),
              ),
        ),
        takeWhile((job) => !this.isTerminal(job), true),
      )
      .subscribe({
        next: (job) => this.updateJob(job),
        error: () =>
          this.error.set(
            'Automatic status updates stopped. Use Refresh status to try again.',
          ),
      });
  }

  private isTerminal(job: Job): boolean {
    return job.status === 'completed' || job.status === 'failed';
  }

  refreshStatus(): void {
    const currentJob = this.job();
    if (!currentJob) {
      return;
    }
    this.refreshing.set(true);
    this.error.set('');
    this.jobsService
      .getJob(currentJob.id)
      .pipe(finalize(() => this.refreshing.set(false)))
      .subscribe({
        next: (job) => this.updateJob(job),
        error: () =>
          this.error.set('We could not refresh this job. Please try again.'),
      });
  }

  private updateJob(job: Job): void {
    this.job.set(job);
    if (job.status === 'completed') {
      this.trackOnce('job_completed');
      if (job.report) {
        this.trackOnce('report_viewed');
      }
    } else if (job.status === 'failed') {
      this.trackOnce('job_failed', { reason: 'unknown' });
    }
  }

  private trackOnce(
    name: AnalyticsEventName,
    parameters: Pick<AnalyticsEventParameters, 'reason'> = {},
  ): void {
    if (this.trackedEvents.has(name)) {
      return;
    }
    this.trackedEvents.add(name);
    this.analytics.trackEvent(name, {
      ...this.analyticsParameters,
      ...parameters,
    });
  }

  private failureReason(error: unknown): AnalyticsFailureReason {
    if (error instanceof UploadValidationError) {
      return 'validation';
    }
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'network';
    }
    return 'unknown';
  }

  private fileSizeBucket(bytes: number): FileSizeBucket {
    const megabyte = 1024 * 1024;
    if (bytes < megabyte) {
      return 'under_1mb';
    }
    if (bytes <= 10 * megabyte) {
      return '1_to_10mb';
    }
    if (bytes <= 50 * megabyte) {
      return '10_to_50mb';
    }
    return 'over_50mb';
  }
}

class UploadValidationError extends Error {}
