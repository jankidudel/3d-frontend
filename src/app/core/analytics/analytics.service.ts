import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ANALYTICS_CONFIG } from './analytics-config';
import { CookieConsentService } from './cookie-consent.service';

export type AnalyticsEventName =
  | 'upload_started'
  | 'upload_completed'
  | 'upload_failed'
  | 'job_processing_started'
  | 'job_completed'
  | 'job_failed'
  | 'report_viewed';

export type FileSizeBucket =
  'under_1mb' | '1_to_10mb' | '10_to_50mb' | 'over_50mb';

export type AnalyticsFailureReason = 'network' | 'validation' | 'unknown';

export interface AnalyticsEventParameters {
  file_type?: 'stl';
  file_size_bucket?: FileSizeBucket;
  reason?: AnalyticsFailureReason;
}

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

  trackEvent(
    name: AnalyticsEventName,
    parameters: AnalyticsEventParameters = {},
  ): void {
    if (!this.canTrack()) {
      return;
    }
    this.getWindow().gtag?.('event', name, this.sanitise(parameters));
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

  private sanitise(
    parameters: AnalyticsEventParameters,
  ): AnalyticsEventParameters {
    const safeParameters: AnalyticsEventParameters = {};
    if (parameters.file_type === 'stl') {
      safeParameters.file_type = parameters.file_type;
    }
    if (
      parameters.file_size_bucket === 'under_1mb' ||
      parameters.file_size_bucket === '1_to_10mb' ||
      parameters.file_size_bucket === '10_to_50mb' ||
      parameters.file_size_bucket === 'over_50mb'
    ) {
      safeParameters.file_size_bucket = parameters.file_size_bucket;
    }
    if (
      parameters.reason === 'network' ||
      parameters.reason === 'validation' ||
      parameters.reason === 'unknown'
    ) {
      safeParameters.reason = parameters.reason;
    }
    return safeParameters;
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
