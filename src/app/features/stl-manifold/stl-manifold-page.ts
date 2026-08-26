import {
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { JobsService } from '../../core/api/jobs.service';
import { StlJobService } from '../../core/api/stl-job.service';
import { StlJobProgress } from '../../core/components/stl-job-progress/stl-job-progress';
import {
  createAndUploadStlJob,
  PollingTimeoutError,
  pollStlJob,
} from '../../core/api/stl-job-workflow';
import { uploadErrorMessage } from '../../core/api/upload-error';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { Job, JobStatus } from '../../models/job';
import { jobFailureMessage } from '../../models/job-failure';
import { StlFilePicker } from '../stl-quality/stl-file-picker/stl-file-picker';

type ResultCategory = 'manifold' | 'open_edges' | 'non_manifold' | 'both';
type ReportRecord = Record<string, unknown>;

@Component({
  selector: 'app-stl-manifold-page',
  imports: [RouterLink, StlFilePicker, StlJobProgress],
  templateUrl: './stl-manifold-page.html',
  styleUrl: './stl-manifold-page.scss',
})
export class StlManifoldPage {
  readonly routeUrl = PublicRouteUrl;
  readonly jobStatus = JobStatus;
  readonly jobFailureMessage = jobFailureMessage;
  private readonly jobsService = inject(JobsService);
  private readonly stlJobs = inject(StlJobService);
  private readonly analytics = inject(AnalyticsService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private polling?: Subscription;
  private outcomeTracked = false;
  readonly selectedFile = signal<File | null>(null);
  private readonly filePicker = viewChild(StlFilePicker);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);
  readonly refreshing = signal(false);
  readonly pollingTimedOut = signal(false);
  readonly error = signal('');
  readonly report = computed(() => this.asRecord(this.job()?.report));
  readonly topology = computed(() =>
    this.asRecord(this.report()?.['topology']),
  );
  readonly openEdges = computed(() =>
    this.count(this.topology()?.['openEdgeCount']),
  );
  readonly nonManifoldEdges = computed(() =>
    this.count(this.topology()?.['nonManifoldEdgeCount']),
  );
  readonly shellCount = computed(() =>
    this.count(this.topology()?.['connectedComponentCount']),
  );
  readonly hasOrientationIssue = computed(
    () => this.topology()?.['hasInconsistentOrientation'] === true,
  );
  readonly category = computed<ResultCategory>(() => {
    const open = this.openEdges() > 0;
    const nonManifold = this.nonManifoldEdges() > 0;
    return open && nonManifold
      ? 'both'
      : open
        ? 'open_edges'
        : nonManifold
          ? 'non_manifold'
          : 'manifold';
  });
  readonly processing = computed(() => {
    const status = this.job()?.status;
    return (
      !this.pollingTimedOut() &&
      (status === JobStatus.Created || status === JobStatus.Processing)
    );
  });

  constructor() {
    this.seo.apply({
      title: 'STL Manifold Checker - Check if Your STL Is Watertight',
      description:
        'Check an STL file for open edges, non-manifold geometry and disconnected shells. Find out whether your 3D model is manifold and ready for slicing.',
      path: PublicRouteUrl.ManifoldChecker,
    });
    this.destroyRef.onDestroy(() => this.polling?.unsubscribe());
  }

  onFileSelected(file: File | null): void {
    this.polling?.unsubscribe();
    this.selectedFile.set(file);
    this.job.set(null);
    this.error.set('');
    this.pollingTimedOut.set(false);
    this.outcomeTracked = false;
  }

  checkManifold(): void {
    if (this.submitting()) {
      return;
    }
    const file = this.selectedFile();
    if (!file) {
      this.error.set('Choose a valid STL file before checking its topology.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.analytics.trackUploadStarted('manifold_checker', file.size);
    createAndUploadStlJob(this.stlJobs, this.jobsService, file, (job) =>
      this.job.set(job),
    ).subscribe({
      next: () => {
        this.selectedFile.set(null);
        this.filePicker()?.clear();
        this.submitting.set(false);
        this.analytics.trackUploadCompleted('manifold_checker');
        const job = this.job();
        if (job) {
          this.startPolling(job.id);
        }
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(uploadErrorMessage(error));
      },
    });
  }

  refreshStatus(): void {
    const job = this.job();
    if (!job) {
      return;
    }
    this.refreshing.set(true);
    this.jobsService
      .getJob(job.id)
      .pipe(finalize(() => this.refreshing.set(false)))
      .subscribe({
        next: (updated) => this.updateJob(updated),
        error: () =>
          this.error.set('We could not refresh this job. Please try again.'),
      });
  }

  viewFullReport(): void {
    const job = this.job();
    if (!job) {
      return;
    }
    this.analytics.trackFullQualityReportOpened();
    void this.router.navigate([PublicRouteUrl.QualityCheck], {
      state: { job },
    });
  }

  checkAnotherFile(): void {
    this.filePicker()?.open();
  }
  formatNumber(value: unknown): string {
    return typeof value === 'number' && Number.isFinite(value)
      ? new Intl.NumberFormat('en').format(value)
      : '0';
  }

  private startPolling(jobId: string): void {
    this.polling?.unsubscribe();
    this.polling = pollStlJob(this.jobsService, jobId).subscribe({
      next: (job) => this.updateJob(job),
      error: (error: unknown) => this.handlePollingError(error),
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
      this.analytics.trackAnalysisCompleted('manifold_checker', job.report);
      this.analytics.trackManifoldResult(this.category());
      this.outcomeTracked = true;
    } else if (job.status === JobStatus.Failed) {
      this.analytics.trackAnalysisFailed('manifold_checker', job.failure);
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
  private count(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? value
      : 0;
  }
  private asRecord(value: unknown): ReportRecord | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as ReportRecord)
      : null;
  }
}
