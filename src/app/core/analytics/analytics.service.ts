import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { JobFailure } from '../../models/job';
import { jobFailureCategory } from '../../models/job-failure';
import { ANALYTICS_CONFIG } from './analytics-config';
import { CookieConsentService } from './cookie-consent.service';

export type AnalyticsTool =
  'quality_check' | 'dimensions_checker' | 'volume_calculator';
export type AnalyticsMaterial =
  'pla' | 'petg' | 'abs' | 'tpu' | 'resin' | 'custom';

export const AnalyticsEvent = {
  UploadStarted: 'stl_upload_started',
  UploadCompleted: 'stl_upload_completed',
  AnalysisCompleted: 'stl_analysis_completed',
  AnalysisFailed: 'stl_analysis_failed',
  ReportDownloaded: 'stl_report_downloaded',
  ScaleCalculated: 'stl_scale_calculated',
  PrinterFitChecked: 'stl_printer_fit_checked',
  MaterialEstimateUsed: 'stl_material_estimate_used',
} as const;

type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

type AnalyticsEventParameters = Record<string, string>;

type GtagArguments = [
  command: string,
  target: string | Date,
  parameters?: object,
];
type AnalyticsWindow = Window & {
  dataLayer?: GtagArguments[];
  gtag?: (...args: GtagArguments) => void;
};

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly consent = inject(CookieConsentService);
  private readonly config = inject(ANALYTICS_CONFIG);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly measurementId = this.config.googleAnalyticsMeasurementId;
  private readonly enabled =
    this.isBrowser &&
    this.measurementId.length > 0 &&
    !this.measurementId.includes('REPLACE_ME');
  private scriptRequested = false;
  private scriptLoaded = false;
  private initialised = false;
  private currentPath = this.cleanPath(this.router.url);

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => {
        this.currentPath = this.cleanPath(event.urlAfterRedirects);
        this.trackPageView();
      });

    effect(() => {
      if (this.consent.analyticsAllowed()) {
        this.enable();
      } else {
        this.disable();
      }
    });
  }

  trackUploadStarted(tool: AnalyticsTool, fileSizeBytes: number): void {
    this.sendEvent(AnalyticsEvent.UploadStarted, {
      tool,
      file_size_bucket: this.fileSizeBucket(fileSizeBytes),
    });
  }

  trackUploadCompleted(tool: AnalyticsTool): void {
    this.sendEvent(AnalyticsEvent.UploadCompleted, { tool });
  }

  trackAnalysisCompleted(tool: AnalyticsTool, report: unknown): void {
    const reportRecord = this.asRecord(report);
    const validation = this.asRecord(reportRecord?.['validation']);
    const issues = validation?.['issues'];
    const issueCount = Array.isArray(issues) ? issues.length : 0;
    const triangleCount = reportRecord?.['triangleCount'];
    this.sendEvent(AnalyticsEvent.AnalysisCompleted, {
      tool,
      validation_result: validation?.['isValid'] === true ? 'valid' : 'invalid',
      issue_count_bucket: this.issueCountBucket(issueCount),
      triangle_count_bucket: this.triangleCountBucket(
        typeof triangleCount === 'number' ? triangleCount : 0,
      ),
    });
  }

  trackAnalysisFailed(
    tool: AnalyticsTool,
    failure: JobFailure | undefined,
  ): void {
    this.sendEvent(AnalyticsEvent.AnalysisFailed, {
      tool,
      failure_category: jobFailureCategory(failure),
    });
  }

  trackReportDownloaded(tool: AnalyticsTool, format: 'json' | 'pdf'): void {
    this.sendEvent(AnalyticsEvent.ReportDownloaded, { tool, format });
  }

  trackScaleCalculated(targetDimension: 'width' | 'height' | 'depth'): void {
    this.sendEvent(AnalyticsEvent.ScaleCalculated, {
      tool: 'dimensions_checker',
      target_dimension: targetDimension,
    });
  }

  trackPrinterFitChecked(fits: boolean): void {
    this.sendEvent(AnalyticsEvent.PrinterFitChecked, {
      tool: 'dimensions_checker',
      fit_result: fits ? 'fits' : 'does_not_fit',
    });
  }

  trackMaterialEstimateUsed(material: AnalyticsMaterial): void {
    this.sendEvent(AnalyticsEvent.MaterialEstimateUsed, {
      tool: 'volume_calculator',
      material,
    });
  }

  private enable(): void {
    if (!this.enabled) {
      return;
    }
    this.setMeasurementDisabled(false);
    if (this.initialised) {
      return;
    }
    if (this.scriptLoaded) {
      this.initialise();
      return;
    }
    if (this.scriptRequested) {
      return;
    }

    this.scriptRequested = true;
    const script = this.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.measurementId)}`;
    script.addEventListener('load', () => {
      this.scriptLoaded = true;
      this.initialise();
    });
    script.addEventListener('error', () => {
      this.scriptRequested = false;
      this.scriptLoaded = false;
    });
    this.document.head.appendChild(script);
  }

  private initialise(): void {
    if (this.initialised || !this.consent.analyticsAllowed()) {
      return;
    }
    const browserWindow = this.getWindow();
    browserWindow.dataLayer ??= [];
    browserWindow.gtag ??= (...args: GtagArguments) => {
      browserWindow.dataLayer?.push(args);
    };
    browserWindow.gtag('js', new Date());
    browserWindow.gtag('config', this.measurementId, {
      allow_ad_personalization_signals: false,
      allow_google_signals: false,
      anonymize_ip: true,
      send_page_view: false,
    });
    this.initialised = true;
    this.trackPageView();
  }

  private disable(): void {
    if (this.enabled) {
      this.setMeasurementDisabled(true);
    }
  }

  private trackPageView(): void {
    if (!this.canTrack()) {
      return;
    }
    this.getWindow().gtag?.('event', 'page_view', {
      page_path: this.currentPath,
    });
  }

  private canTrack(): boolean {
    return this.enabled && this.initialised && this.consent.analyticsAllowed();
  }

  private cleanPath(url: string): string {
    return url.split(/[?#]/, 1)[0] || '/';
  }

  private sendEvent(
    name: AnalyticsEventName,
    parameters: AnalyticsEventParameters,
  ): void {
    if (!this.canTrack()) {
      return;
    }
    this.getWindow().gtag?.('event', name, parameters);
  }

  private fileSizeBucket(bytes: number): string {
    const megabyte = 1024 * 1024;
    if (bytes < megabyte) {
      return 'under_1mb';
    }
    if (bytes <= 10 * megabyte) {
      return '1mb_to_10mb';
    }
    if (bytes <= 100 * megabyte) {
      return '10mb_to_100mb';
    }
    return 'over_100mb';
  }

  private issueCountBucket(count: number): string {
    if (count <= 0) {
      return '0';
    }
    if (count <= 5) {
      return '1_to_5';
    }
    if (count <= 20) {
      return '6_to_20';
    }
    return 'over_20';
  }

  private triangleCountBucket(count: number): string {
    if (count < 1000) {
      return 'under_1k';
    }
    if (count < 10000) {
      return '1k_to_10k';
    }
    if (count < 100000) {
      return '10k_to_100k';
    }
    return 'over_100k';
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private getWindow(): AnalyticsWindow {
    return this.document.defaultView as unknown as AnalyticsWindow;
  }

  private setMeasurementDisabled(disabled: boolean): void {
    const browserWindow = this.getWindow() as unknown as Record<
      string,
      unknown
    >;
    browserWindow[`ga-disable-${this.measurementId}`] = disabled;
  }
}
