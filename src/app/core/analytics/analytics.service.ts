import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { JobFailure } from '../../models/job';
import { jobFailureCategory } from '../../models/job-failure';
import { ANALYTICS_CONFIG } from './analytics-config';
import { CookieConsentService } from './cookie-consent.service';

export type AnalyticsTool =
  | 'quality_check'
  | 'dimensions_checker'
  | 'volume_calculator'
  | 'manifold_checker';
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
  ManifoldResult: 'stl_manifold_result',
  FullQualityReportOpened: 'stl_full_quality_report_opened',
  StlViewerFileSelected: 'stl_viewer_file_selected',
  StlViewerModelLoaded: 'stl_viewer_model_loaded',
  StlViewerLoadFailed: 'stl_viewer_load_failed',
  StlViewerResetView: 'stl_viewer_reset_view',
  StlViewerOpenedQualityChecker: 'stl_viewer_opened_quality_checker',
  ThreeMfQualityCheckStarted: '3mf_quality_check_started',
  ThreeMfQualityReportGenerated: '3mf_quality_report_generated',
  ThreeMfQualityCheckFailed: '3mf_quality_check_failed',
  ThreeMfQualityReportDownloaded: '3mf_quality_report_downloaded',
  ThreeMfRepairUploadStarted: '3mf_repair_upload_started',
  ThreeMfRepairCompleted: '3mf_repair_completed',
  ThreeMfRepairDownloaded: '3mf_repair_downloaded',
  ThreeMfRepairJsonDownloaded: '3mf_repair_json_downloaded',
  ThreeMfRepairPdfDownloaded: '3mf_repair_pdf_downloaded',
  SplitterUploadStarted: 'stl_splitter_upload_started',
  SplitterSplitStarted: 'stl_splitter_split_started',
  SplitterCompleted: 'stl_splitter_completed',
  SplitterFailed: 'stl_splitter_failed',
  SplitterPartADownloaded: 'stl_splitter_part_a_downloaded',
  SplitterPartBDownloaded: 'stl_splitter_part_b_downloaded',
  SplitterJsonDownloaded: 'stl_splitter_json_downloaded',
  SplitterPdfDownloaded: 'stl_splitter_pdf_downloaded',
  ReducerFileSelected: 'stl_reducer_file_selected',
  ReducerLosslessCompleted: 'stl_reducer_lossless_completed',
  ReducerReductionCompleted: 'stl_reducer_reduction_completed',
  ReducerReducedDownloaded: 'stl_reducer_reduced_downloaded',
  ReducerPresetSelected: 'stl_reducer_preset_selected',
  StlScaleCompleted: 'stl_scale_completed',
} as const;

type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

type AnalyticsEventParameters = Record<string, string>;

type GtagArguments = [
  command: string,
  target: string | Date,
  parameters?: object,
];
type AnalyticsWindow = Window & {
  dataLayer?: IArguments[];
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

  trackManifoldResult(
    category: 'manifold' | 'open_edges' | 'non_manifold' | 'both',
  ): void {
    this.sendEvent(AnalyticsEvent.ManifoldResult, { category });
  }

  trackFullQualityReportOpened(): void {
    this.sendEvent(AnalyticsEvent.FullQualityReportOpened, {
      tool: 'manifold_checker',
    });
  }

  trackStlViewerFileSelected(fileSizeBytes: number): void {
    this.sendEvent(AnalyticsEvent.StlViewerFileSelected, {
      file_size_bucket: this.viewerFileSizeBucket(fileSizeBytes),
    });
  }

  trackStlViewerLoaded(fileSizeBytes: number): void {
    this.sendEvent(AnalyticsEvent.StlViewerModelLoaded, {
      file_size_bucket: this.viewerFileSizeBucket(fileSizeBytes),
    });
  }

  trackStlViewerFailed(
    failureKind:
      'too_large' | 'wrong_extension' | 'parse_failed' | 'webgl_unavailable',
  ): void {
    this.sendEvent(AnalyticsEvent.StlViewerLoadFailed, {
      failure_kind: failureKind,
    });
  }

  trackStlViewerReset(): void {
    this.sendEvent(AnalyticsEvent.StlViewerResetView, {});
  }

  trackStlViewerQualityOpened(): void {
    this.sendEvent(AnalyticsEvent.StlViewerOpenedQualityChecker, {});
  }

  trackStlScaleCompleted(): void {
    this.sendEvent(AnalyticsEvent.StlScaleCompleted, {});
  }

  trackThreeMfQualityStarted(fileSizeBytes: number): void {
    this.sendEvent(AnalyticsEvent.ThreeMfQualityCheckStarted, {
      file_size_bucket: this.viewerFileSizeBucket(fileSizeBytes),
    });
  }

  trackThreeMfQualityGenerated(): void {
    this.sendEvent(AnalyticsEvent.ThreeMfQualityReportGenerated, {});
  }

  trackThreeMfQualityFailed(
    failureCategory: 'upload_failed' | 'processing_failed',
  ): void {
    this.sendEvent(AnalyticsEvent.ThreeMfQualityCheckFailed, {
      failure_category: failureCategory,
    });
  }

  trackThreeMfQualityReportDownloaded(): void {
    this.sendEvent(AnalyticsEvent.ThreeMfQualityReportDownloaded, {});
  }

  trackThreeMfRepair(
    event:
      | typeof AnalyticsEvent.ThreeMfRepairUploadStarted
      | typeof AnalyticsEvent.ThreeMfRepairCompleted
      | typeof AnalyticsEvent.ThreeMfRepairDownloaded
      | typeof AnalyticsEvent.ThreeMfRepairJsonDownloaded
      | typeof AnalyticsEvent.ThreeMfRepairPdfDownloaded,
    fileSizeBytes?: number,
  ): void {
    this.sendEvent(
      event,
      fileSizeBytes === undefined
        ? {}
        : { file_size_kib: String(Math.round(fileSizeBytes / 1024)) },
    );
  }

  trackSplitter(
    event:
      | typeof AnalyticsEvent.SplitterUploadStarted
      | typeof AnalyticsEvent.SplitterSplitStarted
      | typeof AnalyticsEvent.SplitterCompleted
      | typeof AnalyticsEvent.SplitterFailed
      | typeof AnalyticsEvent.SplitterPartADownloaded
      | typeof AnalyticsEvent.SplitterPartBDownloaded
      | typeof AnalyticsEvent.SplitterJsonDownloaded
      | typeof AnalyticsEvent.SplitterPdfDownloaded,
    fileSizeBytes?: number,
  ): void {
    this.sendEvent(
      event,
      fileSizeBytes === undefined
        ? {}
        : { file_size_kib: String(Math.round(fileSizeBytes / 1024)) },
    );
  }

  trackReducer(
    event:
      | typeof AnalyticsEvent.ReducerFileSelected
      | typeof AnalyticsEvent.ReducerLosslessCompleted
      | typeof AnalyticsEvent.ReducerReductionCompleted
      | typeof AnalyticsEvent.ReducerReducedDownloaded
      | typeof AnalyticsEvent.ReducerPresetSelected,
  ): void {
    this.sendEvent(event, {});
  }

  private enable(): void {
    if (!this.enabled) {
      return;
    }
    this.setMeasurementDisabled(false);
    if (this.initialised) {
      return;
    }
    if (this.scriptRequested) {
      return;
    }

    // Queue the configuration before loading gtag.js so the external script can
    // process every command as soon as it starts.
    this.initialise();
    this.scriptRequested = true;
    const script = this.document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(this.measurementId)}`;
    script.addEventListener('error', () => {
      this.scriptRequested = false;
      this.initialised = false;
    });
    this.document.head.appendChild(script);
  }

  private initialise(): void {
    if (this.initialised || !this.consent.analyticsAllowed()) {
      return;
    }
    const browserWindow = this.getWindow();
    browserWindow.dataLayer ??= [];
    browserWindow.gtag ??= function (): void {
      // Google gtag.js expects the function's Arguments object, not an array.
      // eslint-disable-next-line prefer-rest-params
      browserWindow.dataLayer?.push(arguments);
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

  private viewerFileSizeBucket(bytes: number): string {
    const megabyte = 1024 * 1024;
    if (bytes < megabyte) {
      return 'under_1mb';
    }
    if (bytes <= 5 * megabyte) {
      return '1_to_5mb';
    }
    return '5_to_25mb';
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
