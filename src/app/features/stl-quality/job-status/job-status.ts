import { DOCUMENT, JsonPipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Job } from '../../../models/job';
import { jobFailureMessage } from '../../../models/job-failure';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { StlQualityPdfService } from './stl-quality-pdf.service';
import {
  guidanceForIssues,
  normalizeValidationIssues,
} from './validation-issues';

interface QualityReport {
  [key: string]: unknown;
}
@Component({
  selector: 'app-job-status',
  imports: [JsonPipe],
  templateUrl: './job-status.html',
  styleUrl: './job-status.scss',
})
export class JobStatusComponent {
  private readonly document = inject(DOCUMENT);
  private readonly pdfService = inject(StlQualityPdfService);
  private readonly analytics = inject(AnalyticsService);
  readonly job = input.required<Job>();
  readonly uploading = input(false);
  readonly refreshing = input(false);
  readonly generatingPdf = signal(false);
  readonly pdfError = signal('');
  readonly refresh = output<void>();
  readonly processing = computed(() =>
    ['created', 'processing'].includes(this.job().status),
  );
  readonly failureMessage = computed(() =>
    jobFailureMessage(this.job().failure),
  );
  readonly report = computed(() => this.asRecord(this.job().report));
  readonly validation = computed(() =>
    this.asRecord(this.report()?.['validation']),
  );
  readonly isValid = computed(() => this.validation()?.['isValid'] === true);
  readonly issues = computed(() =>
    normalizeValidationIssues(this.validation()?.['issues']),
  );
  readonly issueGuidance = computed(() => guidanceForIssues(this.issues()));
  readonly hasOnlyWarnings = computed(
    () =>
      this.issues().length > 0 &&
      this.issues().every((issue) => issue.severity === 'warning'),
  );
  readonly dimensions = computed(() =>
    this.asRecord(this.report()?.['dimensions']),
  );
  readonly boundingBox = computed(() =>
    this.asRecord(this.report()?.['boundingBox']),
  );
  readonly topology = computed(() =>
    this.asRecord(this.report()?.['topology']),
  );
  readonly connectedComponentCount = computed(() => {
    const count = this.topology()?.['connectedComponentCount'];
    return typeof count === 'number' && Number.isInteger(count) && count >= 0
      ? count
      : null;
  });

  connectedComponentsLabel(count: number): string {
    return count === 1
      ? '1 connected component'
      : `${count} separate components`;
  }

  formatNumber(value: unknown, maximumFractionDigits = 2): string {
    return typeof value === 'number' && Number.isFinite(value)
      ? new Intl.NumberFormat('en', { maximumFractionDigits }).format(value)
      : '—';
  }

  formatInteger(value: unknown): string {
    return this.formatNumber(value, 0);
  }

  formatFileSize(value: unknown): string {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return '—';
    }
    const units = ['bytes', 'KB', 'MB', 'GB'];
    let size = value;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${this.formatNumber(size, unit === 0 ? 0 : 1)} ${units[unit]}`;
  }

  downloadReport(): void {
    const report = this.job().report;
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
    link.download = this.downloadFileName();
    link.click();
    this.analytics.trackReportDownloaded('quality_check', 'json');
    view.setTimeout(() => view.URL.revokeObjectURL(objectUrl), 0);
  }

  async downloadPdfReport(): Promise<void> {
    if (!this.report() || this.generatingPdf()) {
      return;
    }
    this.generatingPdf.set(true);
    this.pdfError.set('');
    try {
      await this.pdfService.download(this.job());
      this.analytics.trackReportDownloaded('quality_check', 'pdf');
    } catch {
      this.pdfError.set(
        'We could not generate the PDF report. Please try again.',
      );
    } finally {
      this.generatingPdf.set(false);
    }
  }

  private downloadFileName(): string {
    const reportName = this.report()?.['fileName'];
    const sourceName =
      typeof reportName === 'string' && reportName.trim()
        ? reportName
        : this.job().fileName;
    const safeStem = sourceName
      .replace(/\.stl$/i, '')
      .trim()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100);
    return `${safeStem || 'model'}-quality-report.json`;
  }

  private asRecord(value: unknown): QualityReport | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as QualityReport)
      : null;
  }
}
