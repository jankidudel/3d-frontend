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
import { JobsService } from '../../core/api/jobs.service';
import { createAndUploadThreeMfJob } from '../../core/api/three-mf-job-workflow';
import { pollJob, PollingTimeoutError } from '../../core/api/job-polling';
import { JobCreationService } from '../../core/api/job-creation.service';
import { uploadErrorMessage } from '../../core/api/upload-error';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { SeoService } from '../../core/seo/seo.service';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { Job, JobStatus } from '../../models/job';
import { jobFailureMessageForFormat } from '../../models/job-failure';
import { ThreeMfFilePicker } from './threemf-file-picker';
import {
  DisplayIssue,
  guidanceForIssues,
  normalizeValidationIssues,
} from '../../shared/mesh-validation-issues';
import { MeshQualityPdfService } from '../../shared/mesh-quality-pdf.service';
import { ModelFileFormat } from '../../core/formats/model-file-format';

type ReportRecord = Record<string, unknown>;
@Component({
  selector: 'app-three-mf-quality-page',
  imports: [RouterLink, ThreeMfFilePicker, JobProgress],
  templateUrl: './threemf-quality-page.html',
  styleUrl: '../shared/model-checker-page.scss',
})
export class ThreeMfQualityPage {
  readonly routeUrl = PublicRouteUrl;
  readonly jobStatus = JobStatus;
  readonly jobFailureMessage = (failure: Job['failure']) =>
    jobFailureMessageForFormat(failure, ModelFileFormat.ThreeMf);
  readonly selectedFile = signal<File | null>(null);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);
  readonly refreshing = signal(false);
  readonly pollingTimedOut = signal(false);
  readonly error = signal('');
  readonly generatingPdf = signal(false);
  readonly reportDownloadError = signal('');
  readonly report = computed(() => this.asRecord(this.job()?.report));
  readonly processing = computed(() => {
    const status = this.job()?.status;
    return (
      (status === JobStatus.Created || status === JobStatus.Processing) &&
      !this.pollingTimedOut()
    );
  });
  private readonly picker = viewChild(ThreeMfFilePicker);
  private readonly document = inject(DOCUMENT);
  private readonly jobs = inject(JobsService);
  private readonly jobCreation = inject(JobCreationService);
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  private readonly pdfService = inject(MeshQualityPdfService);
  private readonly destroyRef = inject(DestroyRef);
  private polling?: Subscription;
  constructor() {
    this.seo.apply({
      title:
        '3MF Quality Checker - Validate 3MF Files for 3D Printing | InspectMesh',
      description:
        'Check 3MF files for mesh problems before 3D printing. Inspect dimensions, triangle count, topology issues and the file’s declared unit online.',
      path: PublicRouteUrl.ThreeMfQualityCheck,
    });
    this.destroyRef.onDestroy(() => this.polling?.unsubscribe());
  }
  onFileSelected(file: File | null): void {
    this.polling?.unsubscribe();
    this.selectedFile.set(file);
    this.job.set(null);
    this.error.set('');
    this.pollingTimedOut.set(false);
  }
  check(): void {
    const file = this.selectedFile();
    if (!file || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.analytics.trackThreeMfQualityStarted(file.size);
    createAndUploadThreeMfJob(this.jobCreation, this.jobs, file, (job) =>
      this.job.set(job),
    ).subscribe({
      next: () => {
        this.selectedFile.set(null);
        this.picker()?.clear();
        this.submitting.set(false);
        const job = this.job();
        if (job) {
          this.poll(job.id);
        }
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(uploadErrorMessage(error));
        this.analytics.trackThreeMfQualityFailed('upload_failed');
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
          this.error.set('We could not refresh this job. Please try again.'),
      });
  }
  format(value: unknown): string {
    return typeof value === 'number' && Number.isFinite(value)
      ? new Intl.NumberFormat('en', { maximumFractionDigits: 3 }).format(value)
      : 'Not available';
  }
  validationIsValid(report: ReportRecord): boolean {
    return (
      report['isValid'] === true ||
      this.asRecord(report['validation'])?.['isValid'] === true
    );
  }
  summary(report: ReportRecord, field: string): unknown {
    return this.asRecord(report['summary'])?.[field];
  }
  resultStatus(report: ReportRecord): 'clean' | 'warning' | 'error' {
    if (!this.validationIsValid(report)) return 'error';
    return Number(this.summary(report, 'warningCount') ?? 0) > 0
      ? 'warning'
      : 'clean';
  }
  models(report: ReportRecord): readonly ReportRecord[] {
    const models = report['models'];
    return Array.isArray(models)
      ? models
          .map((model) => this.asRecord(model))
          .filter((model): model is ReportRecord => model !== null)
      : [];
  }
  modelDimension(
    model: ReportRecord,
    axis: 'width' | 'height' | 'depth',
  ): unknown {
    return this.asRecord(model['dimensions'])?.[axis];
  }
  dimension(report: ReportRecord, axis: 'width' | 'height' | 'depth'): unknown {
    return this.asRecord(report['dimensions'])?.[axis];
  }
  issues(report: ReportRecord): DisplayIssue[] {
    return normalizeValidationIssues(
      this.asRecord(report['validation'])?.['issues'],
    );
  }

  issueGuidance(report: ReportRecord): ReturnType<typeof guidanceForIssues> {
    return guidanceForIssues(this.issues(report), ModelFileFormat.ThreeMf);
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
    this.analytics.trackThreeMfQualityReportDownloaded('json');
    view.setTimeout(() => view.URL.revokeObjectURL(objectUrl), 0);
  }
  async downloadPdfReport(): Promise<void> {
    const job = this.job();
    if (!job || !this.report() || this.generatingPdf()) {
      return;
    }
    this.generatingPdf.set(true);
    this.reportDownloadError.set('');
    try {
      await this.pdfService.download(job);
      this.analytics.trackThreeMfQualityReportDownloaded('pdf');
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
          const report = this.asRecord(job.report);
          this.analytics.trackThreeMfQualityGenerated(
            report ? this.resultStatus(report) : 'error',
          );
        } else if (job.status === JobStatus.Failed) {
          this.analytics.trackThreeMfQualityFailed('processing_failed');
        }
      },
      error: (error: unknown) => {
        if (error instanceof PollingTimeoutError) {
          this.pollingTimedOut.set(true);
        } else {
          this.error.set(
            'Automatic status updates were interrupted. Please refresh the result.',
          );
        }
      },
    });
  }
  private asRecord(value: unknown): ReportRecord | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as ReportRecord)
      : null;
  }
  private downloadFileName(extension: 'json' | 'pdf'): string {
    const reportName = this.report()?.['fileName'];
    const sourceName =
      typeof reportName === 'string' && reportName.trim()
        ? reportName
        : (this.job()?.fileName ?? 'model');
    const safeStem = sourceName
      .replace(/\.3mf$/i, '')
      .trim()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
    return `${safeStem || 'model'}-quality-report.${extension}`;
  }
}
