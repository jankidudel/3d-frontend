import { GuideRouteUrl } from '../../../core/seo/guide-routes';
import {
  Component,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { finalize, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { JobsService } from '../../../core/api/jobs.service';
import { StlJobService } from '../../../core/api/stl-job.service';
import { uploadErrorMessage } from '../../../core/api/upload-error';
import {
  createAndUploadStlJob,
  PollingTimeoutError,
  pollStlJob,
} from '../../../core/api/stl-job-workflow';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { SeoService } from '../../../core/seo/seo.service';
import { PublicRouteUrl } from '../../../core/seo/public-routes';
import { Job, JobStatus } from '../../../models/job';
import { JobStatusComponent } from '../job-status/job-status';
import { StlFilePicker } from '../stl-file-picker/stl-file-picker';
import { FeedbackLinkComponent } from '../../../core/components/feedback-link/feedback-link';
import { ExampleAsset } from '../../examples/example-assets';
import { ExampleLoader } from '../../examples/example-loader';

@Component({
  selector: 'app-stl-quality-page',
  imports: [
    StlFilePicker,
    JobStatusComponent,
    FeedbackLinkComponent,
    ExampleLoader,
  ],
  templateUrl: './stl-quality-page.html',
  styleUrl: './stl-quality-page.scss',
})
export class StlQualityPage {
  readonly exampleAsset = ExampleAsset;
  readonly guideRouteUrl = GuideRouteUrl;
  readonly routeUrl = PublicRouteUrl;
  private readonly jobsService = inject(JobsService);
  private readonly stlJobs = inject(StlJobService);
  private readonly analytics = inject(AnalyticsService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private polling?: Subscription;
  private uploadStartedTracked = false;
  private uploadCompletedTracked = false;
  private outcomeTracked = false;
  readonly selectedFile = signal<File | null>(null);
  /** Kept only in this browser tab so local issue highlighting never needs a download URL. */
  readonly localResultFile = signal<File | null>(null);
  private readonly filePicker = viewChild(StlFilePicker);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);
  readonly pollingTimedOut = signal(false);
  readonly refreshing = signal(false);
  readonly error = signal('');

  constructor() {
    this.seo.apply({
      title: 'STL Quality Checker: Mesh Findings and Next Steps | InspectMesh',
      description:
        'Check STL boundaries, over-shared edges, exact duplicates, degenerate faces and winding findings with controlled examples and clear next steps.',
      path: PublicRouteUrl.QualityCheck,
    });
    this.destroyRef.onDestroy(() => this.polling?.unsubscribe());
    const handoffJob =
      this.router.getCurrentNavigation()?.extras.state?.['job'];
    if (this.isJob(handoffJob)) {
      this.updateJob(handoffJob);
      if (
        handoffJob.status === JobStatus.Created ||
        handoffJob.status === JobStatus.Processing
      ) {
        this.startPolling(handoffJob.id);
      }
    }
  }

  onFileSelected(file: File | null): void {
    this.polling?.unsubscribe();
    this.selectedFile.set(file);
    this.localResultFile.set(null);
    this.error.set('');
    this.job.set(null);
    this.pollingTimedOut.set(false);
    this.uploadStartedTracked = false;
    this.uploadCompletedTracked = false;
    this.outcomeTracked = false;
  }

  readonly loadPublicExample = async (
    files: readonly File[],
  ): Promise<void> => {
    this.onFileSelected(files[0] ?? null);
  };

  checkStl(): void {
    if (this.submitting()) {
      return;
    }
    const file = this.selectedFile();
    if (!file) {
      this.error.set('Choose a valid STL file before starting the check.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    if (!this.uploadStartedTracked) {
      this.analytics.trackUploadStarted('quality_check', file.size);
      this.uploadStartedTracked = true;
    }
    this.localResultFile.set(file);
    createAndUploadStlJob(this.stlJobs, this.jobsService, file, (job) =>
      this.job.set(job),
    ).subscribe({
      next: () => {
        this.submitting.set(false);
        if (!this.uploadCompletedTracked) {
          this.analytics.trackUploadCompleted('quality_check');
          this.uploadCompletedTracked = true;
        }
        const createdJob = this.job();
        if (createdJob) {
          this.startPolling(createdJob.id);
        }
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(uploadErrorMessage(error));
      },
    });
  }

  private startPolling(jobId: string): void {
    this.polling?.unsubscribe();
    this.polling = pollStlJob(this.jobsService, jobId).subscribe({
      next: (job) => this.updateJob(job),
      error: (error: unknown) => this.handlePollingError(error),
    });
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
    if (job.status === JobStatus.Completed || job.status === JobStatus.Failed) {
      this.pollingTimedOut.set(false);
    }
    if (this.outcomeTracked) {
      return;
    }
    if (job.status === JobStatus.Completed) {
      this.analytics.trackAnalysisCompleted('quality_check', job.report);
      this.outcomeTracked = true;
    } else if (job.status === JobStatus.Failed) {
      this.analytics.trackAnalysisFailed('quality_check', job.failure);
      this.outcomeTracked = true;
    }
  }

  private handlePollingError(error: unknown): void {
    if (error instanceof PollingTimeoutError) {
      this.pollingTimedOut.set(true);
      this.error.set(
        'This check is taking longer than expected. Use Check again below to see whether it has finished.',
      );
      return;
    }
    this.error.set(
      'Automatic status updates were interrupted. You can use Check again below, or upload the file again.',
    );
  }

  private isJob(value: unknown): value is Job {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof value.id === 'string' &&
      'status' in value
    );
  }
}
