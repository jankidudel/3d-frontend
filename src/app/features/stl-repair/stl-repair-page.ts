import { FloatingParts } from './floating-parts';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
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
import { FeedbackLinkComponent } from '../../core/components/feedback-link/feedback-link';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { Job, JobStatus } from '../../models/job';
import { uploadErrorMessage } from '../../core/api/upload-error';
import { StlFilePicker } from '../stl-quality/stl-file-picker/stl-file-picker';
import { floatingPartsDemo } from './parts-fixtures';

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
  imports: [
    ToolEvidenceComponent,
    FloatingParts,
    RouterLink,
    StlFilePicker,
    JobProgress,
    FeedbackLinkComponent,
  ],
  templateUrl: './stl-repair-page.html',
  styleUrl: '../stl-quality/stl-quality-page/stl-quality-page.scss',
})
export class StlRepairPage {
  readonly guideRouteUrl = GuideRouteUrl;
  readonly routeUrl = PublicRouteUrl;
  readonly jobStatus = JobStatus;
  readonly selectedFile = signal<File | null>(null);
  readonly originalFile = signal<File | null>(null);
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
  private polling?: Subscription;
  private upload?: Subscription;
  private generation = 0;

  constructor() {
    this.seo.apply({
      title: 'Free STL Repair Tool - Repair STL Files Online | InspectMesh',
      description:
        'Review disconnected STL pieces in your browser, remove selected components, or explicitly run conservative server cleanup. Keep the original file.',
      path: PublicRouteUrl.StlRepair,
    });
    this.destroyRef.onDestroy(() => {
      this.polling?.unsubscribe();
      this.upload?.unsubscribe();
      this.generation++;
    });
  }

  onFileSelected(file: File | null): void {
    this.originalFile.set(file);
    this.selectActiveFile(file);
  }
  loadExample(): void {
    this.onFileSelected(floatingPartsDemo());
  }
  inspectRetained(file: File): void {
    this.selectActiveFile(file);
  }
  restoreOriginal(): void {
    this.selectActiveFile(this.originalFile());
  }
  private selectActiveFile(file: File | null): void {
    this.generation++;
    this.polling?.unsubscribe();
    this.upload?.unsubscribe();
    this.submitting.set(false);
    this.refreshing.set(false);
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
    this.polling?.unsubscribe();
    this.submitting.set(true);
    this.error.set('');
    const generation = this.generation;
    this.upload = createAndUploadStlRepairJob(
      this.stlJobs,
      this.jobs,
      file,
      (job) => {
        if (generation === this.generation) {
          this.job.set(job);
        }
      },
    ).subscribe({
      next: () => {
        if (generation !== this.generation) {
          return;
        }
        this.submitting.set(false);
        const job = this.job();
        if (job) {
          this.poll(job.id);
        }
      },
      error: (error: unknown) => {
        if (generation !== this.generation) {
          return;
        }
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
    const generation = this.generation;
    this.refreshing.set(true);
    this.jobs
      .getJob(job.id)
      .pipe(
        finalize(() => {
          if (generation === this.generation) {
            this.refreshing.set(false);
          }
        }),
      )
      .subscribe({
        next: (value) => {
          if (generation === this.generation) {
            this.job.set(value);
          }
        },
        error: () => {
          if (generation === this.generation) {
            this.error.set(
              'We could not refresh this repair job. Please try again.',
            );
          }
        },
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
