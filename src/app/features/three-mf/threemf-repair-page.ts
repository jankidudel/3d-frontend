import { DOCUMENT } from '@angular/common';
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
import { MeshQualityReport } from '../../models/mesh-quality-report';
import { ThreeMfFilePicker } from './threemf-file-picker';
import {
  DisplayIssue,
  normalizeValidationIssues,
} from '../../shared/mesh-validation-issues';
import { MeshQualityPdfService } from '../../shared/mesh-quality-pdf.service';

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
  afterValidation?: MeshQualityReport;
  warnings?: string[];
};

type RepairResultStatus = {
  readonly description: string;
  readonly title:
    | 'No repairs needed'
    | 'No safe repairs could be applied'
    | 'Repaired safely'
    | 'Repaired with remaining warnings';
  readonly warning: boolean;
};
@Component({
  selector: 'app-three-mf-repair-page',
  imports: [RouterLink, ThreeMfFilePicker, JobProgress],
  templateUrl: './threemf-repair-page.html',
  styleUrl: './threemf-repair-page.scss',
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
  readonly generatingPdf = signal(false);
  readonly reportDownloadError = signal('');
  readonly report = computed(() => this.job()?.report as Report | undefined);
  readonly processing = computed(
    () =>
      (this.job()?.status === JobStatus.Created ||
        this.job()?.status === JobStatus.Processing) &&
      !this.timedOut(),
  );
  private readonly picker = viewChild(ThreeMfFilePicker);
  private readonly document = inject(DOCUMENT);
  private readonly jobs = inject(JobsService);
  private readonly creation = inject(JobCreationService);
  private readonly analytics = inject(AnalyticsService);
  private readonly pdfService = inject(MeshQualityPdfService);
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
    if (!file || this.submitting()) {
      return;
    }
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
  downloaded(): void {
    this.analytics.trackThreeMfRepair(AnalyticsEvent.ThreeMfRepairDownloaded);
  }
  resultStatus(report: Report): RepairResultStatus {
    if (!this.repairsApplied(report)) {
      if (this.afterValidationIsClean(report)) {
        return {
          title: 'No repairs needed',
          description:
            'No safely repairable mesh issues were found. Your original 3MF file was left unchanged.',
          warning: false,
        };
      }
      return {
        title: 'No safe repairs could be applied',
        description:
          'Holes, non-manifold geometry, corrupt structure, or similar issues may require manual repair.',
        warning: true,
      };
    }
    if (this.afterValidationIsClean(report)) {
      return {
        title: 'Repaired safely',
        description:
          'Safe mesh repairs were applied and the repaired file passed validation.',
        warning: false,
      };
    }
    return {
      title: 'Repaired with remaining warnings',
      description:
        'Safe mesh repairs were applied, but the repaired file still has issues to review.',
      warning: true,
    };
  }
  repairsApplied(report: Report): boolean {
    const repair = report.repair;
    return (
      (repair?.degenerateTrianglesRemoved ?? 0) > 0 ||
      (repair?.duplicateTrianglesRemoved ?? 0) > 0 ||
      (repair?.invalidIndexTrianglesRemoved ?? 0) > 0 ||
      (repair?.orientationFixesApplied ?? 0) > 0
    );
  }
  remainingIssues(report: Report): readonly DisplayIssue[] {
    return normalizeValidationIssues(
      report.afterValidation?.validation?.issues,
    );
  }
  canDownloadRepairedFile(report: Report): boolean {
    return (
      this.repairsApplied(report) &&
      report.repair?.repairedFileAvailable === true
    );
  }
  formatInteger(value: number | undefined): string {
    return new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(
      value ?? 0,
    );
  }
  downloadJsonReport(): void {
    const report = this.job()?.report;
    const view = this.document.defaultView;
    if (!report || !view) {
      return;
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const objectUrl = view.URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = objectUrl;
    link.download = this.downloadFileName('json');
    link.click();
    this.analytics.trackThreeMfRepair(
      AnalyticsEvent.ThreeMfRepairJsonDownloaded,
    );
    view.setTimeout(() => view.URL.revokeObjectURL(objectUrl), 0);
  }
  async downloadPdfReport(): Promise<void> {
    const job = this.job();
    const afterValidation = this.report()?.afterValidation;
    if (!job || !afterValidation || this.generatingPdf()) {
      return;
    }
    this.generatingPdf.set(true);
    this.reportDownloadError.set('');
    try {
      await this.pdfService.download({ ...job, report: afterValidation });
      this.analytics.trackThreeMfRepair(
        AnalyticsEvent.ThreeMfRepairPdfDownloaded,
      );
    } catch {
      this.reportDownloadError.set(
        'We could not generate the PDF report. Please try again.',
      );
    } finally {
      this.generatingPdf.set(false);
    }
  }
  private poll(id: string): void {
    this.polling = pollJob(this.jobs, id).subscribe({
      next: (job) => {
        this.job.set(job);
        if (job.status === JobStatus.Completed) {
          this.analytics.trackThreeMfRepair(
            AnalyticsEvent.ThreeMfRepairCompleted,
          );
        }
      },
      error: (error) => {
        if (error instanceof PollingTimeoutError) {
          this.timedOut.set(true);
        } else {
          this.error.set(
            'Automatic status updates were interrupted. Please refresh the result.',
          );
        }
      },
    });
  }
  private afterValidationIsClean(report: Report): boolean {
    return (
      report.afterValidation?.validation?.isValid === true &&
      this.remainingIssues(report).length === 0
    );
  }
  private downloadFileName(extension: 'json' | 'pdf'): string {
    const sourceName = this.job()?.fileName ?? 'model';
    const safeStem = sourceName
      .replace(/\.3mf$/i, '')
      .trim()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
    return `${safeStem || 'model'}-repair-report.${extension}`;
  }
}
