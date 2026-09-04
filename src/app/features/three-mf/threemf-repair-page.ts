import {
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
import { JobCreationService } from '../../core/api/job-creation.service';
import { pollJob, PollingTimeoutError } from '../../core/api/job-polling';
import { JobsService } from '../../core/api/jobs.service';
import { createAndUploadThreeMfRepairJob } from '../../core/api/three-mf-job-workflow';
import { uploadErrorMessage } from '../../core/api/upload-error';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { Job, JobStatus } from '../../models/job';
import { ThreeMfFilePicker } from './threemf-file-picker';

type Report = {
  repair?: {
    repairedFileAvailable?: boolean;
    trianglesBefore?: number;
    trianglesAfter?: number;
    degenerateTrianglesRemoved?: number;
    duplicateTrianglesRemoved?: number;
    invalidIndexTrianglesRemoved?: number;
    orientationFixesApplied?: number;
  };
  afterValidation?: { validation?: { isValid?: boolean; issues?: unknown[] } };
  warnings?: string[];
};
@Component({
  selector: 'app-three-mf-repair-page',
  imports: [RouterLink, ThreeMfFilePicker, JobProgress],
  templateUrl: './threemf-repair-page.html',
  styleUrl: '../shared/model-checker-page.scss',
})
export class ThreeMfRepairPage {
  readonly routeUrl = PublicRouteUrl;
  readonly jobStatus = JobStatus;
  readonly selectedFile = signal<File | null>(null);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);
  readonly refreshing = signal(false);
  readonly timedOut = signal(false);
  readonly error = signal('');
  readonly report = computed(() => this.job()?.report as Report | undefined);
  readonly processing = computed(
    () =>
      (this.job()?.status === JobStatus.Created ||
        this.job()?.status === JobStatus.Processing) &&
      !this.timedOut(),
  );
  private readonly picker = viewChild(ThreeMfFilePicker);
  private readonly jobs = inject(JobsService);
  private readonly creation = inject(JobCreationService);
  private readonly analytics = inject(AnalyticsService);
  private polling?: Subscription;
  constructor() {
    inject(SeoService).apply({
      title: '3MF Repair Tool - Safe 3MF Cleanup | InspectMesh',
      description:
        'Safely remove duplicate and degenerate 3MF triangles while preserving package resources and build structure.',
      path: PublicRouteUrl.ThreeMfRepair,
    });
    inject(DestroyRef).onDestroy(() => this.polling?.unsubscribe());
  }
  onFileSelected(file: File | null): void {
    this.polling?.unsubscribe();
    this.selectedFile.set(file);
    this.job.set(null);
    this.error.set('');
    this.timedOut.set(false);
  }
  repair(): void {
    const file = this.selectedFile();
    if (!file || this.submitting()) return;
    this.submitting.set(true);
    this.analytics.trackThreeMfRepair(
      AnalyticsEvent.ThreeMfRepairUploadStarted,
      file.size,
    );
    createAndUploadThreeMfRepairJob(this.creation, this.jobs, file, (job) =>
      this.job.set(job),
    ).subscribe({
      next: () => {
        this.submitting.set(false);
        this.selectedFile.set(null);
        this.picker()?.clear();
        const job = this.job();
        if (job) this.poll(job.id);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(uploadErrorMessage(error));
      },
    });
  }
  refresh(): void {
    const job = this.job();
    if (!job) return;
    this.refreshing.set(true);
    this.jobs
      .getJob(job.id)
      .pipe(finalize(() => this.refreshing.set(false)))
      .subscribe({
        next: (value) => this.job.set(value),
        error: () =>
          this.error.set(
            'We could not refresh this repair job. Please try again.',
          ),
      });
  }
  downloaded(): void {
    this.analytics.trackThreeMfRepair(AnalyticsEvent.ThreeMfRepairDownloaded);
  }
  private poll(id: string): void {
    this.polling = pollJob(this.jobs, id).subscribe({
      next: (job) => {
        this.job.set(job);
        if (job.status === JobStatus.Completed)
          this.analytics.trackThreeMfRepair(
            AnalyticsEvent.ThreeMfRepairCompleted,
          );
      },
      error: (error) => {
        if (error instanceof PollingTimeoutError) this.timedOut.set(true);
        else
          this.error.set(
            'Automatic status updates were interrupted. Please refresh the result.',
          );
      },
    });
  }
}
