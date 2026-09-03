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
import { JobsService } from '../../core/api/jobs.service';
import { StlJobService } from '../../core/api/stl-job.service';
import {
  createAndUploadStlRepairJob,
  pollStlJob,
  PollingTimeoutError,
} from '../../core/api/stl-job-workflow';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { Job, JobStatus } from '../../models/job';
import { uploadErrorMessage } from '../../core/api/upload-error';
import { StlFilePicker } from '../stl-quality/stl-file-picker/stl-file-picker';

type RepairReport = {
  hasCleanedFile?: boolean;
  isFullyValid?: boolean;
  duplicateTrianglesRemoved?: number;
  degenerateTrianglesRemoved?: number;
  orientationsCorrected?: number;
  skippedReasons?: string[];
  before?: { validation?: { issues?: unknown[] } };
  after?: { validation?: { isValid?: boolean; issues?: unknown[] } };
};

@Component({
  selector: 'app-stl-repair-page',
  imports: [RouterLink, StlFilePicker, JobProgress],
  templateUrl: './stl-repair-page.html',
  styleUrl: '../stl-quality/stl-quality-page/stl-quality-page.scss',
})
export class StlRepairPage {
  readonly routeUrl = PublicRouteUrl;
  readonly jobStatus = JobStatus;
  readonly selectedFile = signal<File | null>(null);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);
  readonly refreshing = signal(false);
  readonly timedOut = signal(false);
  readonly error = signal('');
  readonly report = computed(
    () => this.job()?.report as RepairReport | undefined,
  );
  readonly processing = computed(
    () =>
      this.job()?.status === JobStatus.Created ||
      this.job()?.status === JobStatus.Processing,
  );
  private readonly jobs = inject(JobsService);
  private readonly stlJobs = inject(StlJobService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly picker = viewChild(StlFilePicker);
  private polling?: Subscription;

  constructor() {
    this.seo.apply({
      title: 'STL Repair Tool - Safe STL Cleanup | InspectMesh',
      description:
        'Remove duplicate and degenerate STL triangles, and correct safe simple orientation issues before checking your STL again.',
      path: PublicRouteUrl.StlRepair,
    });
    this.destroyRef.onDestroy(() => this.polling?.unsubscribe());
  }

  onFileSelected(file: File | null): void {
    this.selectedFile.set(file);
    this.job.set(null);
    this.error.set('');
    this.timedOut.set(false);
  }
  repair(): void {
    const file = this.selectedFile();
    if (!file || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    createAndUploadStlRepairJob(this.stlJobs, this.jobs, file, (job) =>
      this.job.set(job),
    ).subscribe({
      next: () => {
        this.submitting.set(false);
        this.selectedFile.set(null);
        this.picker()?.clear();
        const job = this.job();
        if (job) {
          this.poll(job.id);
        }
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(uploadErrorMessage(error));
      },
    });
  }
  refresh(): void {
    const job = this.job();
    if (!job) {
      return;
    }
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
  private poll(id: string): void {
    this.polling = pollStlJob(this.jobs, id).subscribe({
      next: (job) => this.job.set(job),
      error: (error: unknown) => {
        this.timedOut.set(error instanceof PollingTimeoutError);
        this.error.set(
          'Automatic status updates were interrupted. Please refresh the result.',
        );
      },
    });
  }
}
