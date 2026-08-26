import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ANALYTICS_CONFIG } from './analytics-config';
import { AnalyticsService } from './analytics.service';
import { CookieConsentService } from './cookie-consent.service';

describe('AnalyticsService', () => {
  const measurementId = 'G-TEST123';
  type TestAnalyticsWindow = Window & {
    dataLayer?: unknown[];
    gtag?: unknown;
  };

  function queuedCommands(document: Document): unknown[][] {
    const dataLayer = (document.defaultView as unknown as TestAnalyticsWindow)
      .dataLayer;
    return (dataLayer ?? []).map((entry) =>
      Array.from(entry as ArrayLike<unknown>),
    );
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ANALYTICS_CONFIG,
          useValue: { googleAnalyticsMeasurementId: measurementId },
        },
      ],
    });
  });

  afterEach(() => {
    const document = TestBed.inject(DOCUMENT);
    document
      .querySelector('script[src*="googletagmanager.com/gtag/js"]')
      ?.remove();
    const browserWindow =
      document.defaultView as unknown as TestAnalyticsWindow;
    delete browserWindow.dataLayer;
    delete browserWindow.gtag;
    delete (browserWindow as unknown as Record<string, unknown>)[
      `ga-disable-${measurementId}`
    ];
  });

  it('does not load GA or track before consent', () => {
    const document = TestBed.inject(DOCUMENT);
    const analytics = TestBed.inject(AnalyticsService);
    TestBed.flushEffects();

    analytics.trackUploadStarted('quality_check', 512);

    expect(
      document.querySelector('script[src*="googletagmanager.com/gtag/js"]'),
    ).toBeNull();
    expect(
      (document.defaultView as unknown as TestAnalyticsWindow).dataLayer,
    ).toBeUndefined();
  });

  it('loads and tracks only after acceptance', () => {
    const document = TestBed.inject(DOCUMENT);
    const consent = TestBed.inject(CookieConsentService);
    const analytics = TestBed.inject(AnalyticsService);

    consent.accept();
    TestBed.flushEffects();
    const script = document.querySelector<HTMLScriptElement>(
      'script[src*="googletagmanager.com/gtag/js"]',
    );
    expect(script?.src).toContain(measurementId);
    expect(queuedCommands(document)).toContainEqual([
      'config',
      measurementId,
      expect.objectContaining({ send_page_view: false }),
    ]);
    expect(queuedCommands(document)).toContainEqual([
      'event',
      'page_view',
      { page_path: '/' },
    ]);

    script?.dispatchEvent(new Event('load'));
    analytics.trackUploadStarted('dimensions_checker', 5 * 1024 * 1024);
    analytics.trackUploadCompleted('dimensions_checker');
    analytics.trackAnalysisCompleted('dimensions_checker', {
      triangleCount: 12500,
      validation: { isValid: false, issues: new Array(7).fill('open_edge') },
    });
    analytics.trackAnalysisFailed('volume_calculator', {
      error: { code: 'unsupported_format', message: 'do not send me' },
    });

    expect(queuedCommands(document)).toContainEqual([
      'event',
      'stl_upload_started',
      { tool: 'dimensions_checker', file_size_bucket: '1mb_to_10mb' },
    ]);
    expect(queuedCommands(document)).toContainEqual([
      'event',
      'stl_analysis_completed',
      {
        tool: 'dimensions_checker',
        validation_result: 'invalid',
        issue_count_bucket: '6_to_20',
        triangle_count_bucket: '10k_to_100k',
      },
    ]);
    expect(queuedCommands(document)).toContainEqual([
      'event',
      'stl_analysis_failed',
      { tool: 'volume_calculator', failure_category: 'unsupported_format' },
    ]);
    expect(
      JSON.stringify(
        (document.defaultView as unknown as TestAnalyticsWindow).dataLayer,
      ),
    ).not.toContain('do not send me');
  });

  it('stops sending events after consent is withdrawn', () => {
    const document = TestBed.inject(DOCUMENT);
    const consent = TestBed.inject(CookieConsentService);
    const analytics = TestBed.inject(AnalyticsService);
    consent.accept();
    TestBed.flushEffects();
    document
      .querySelector<HTMLScriptElement>(
        'script[src*="googletagmanager.com/gtag/js"]',
      )
      ?.dispatchEvent(new Event('load'));
    const dataLayer = (document.defaultView as unknown as TestAnalyticsWindow)
      .dataLayer;
    const eventCount = dataLayer?.length;

    consent.reject();
    TestBed.flushEffects();
    analytics.trackUploadCompleted('quality_check');

    expect(dataLayer).toHaveLength(eventCount ?? 0);
    expect(
      (document.defaultView as unknown as Record<string, unknown>)[
        `ga-disable-${measurementId}`
      ],
    ).toBe(true);
  });

  it('maps calculator events without accepting raw measurements', () => {
    const document = TestBed.inject(DOCUMENT);
    const consent = TestBed.inject(CookieConsentService);
    const analytics = TestBed.inject(AnalyticsService);
    consent.accept();
    TestBed.flushEffects();
    document
      .querySelector<HTMLScriptElement>(
        'script[src*="googletagmanager.com/gtag/js"]',
      )
      ?.dispatchEvent(new Event('load'));

    analytics.trackReportDownloaded('quality_check', 'pdf');
    analytics.trackScaleCalculated('height');
    analytics.trackPrinterFitChecked(false);
    analytics.trackMaterialEstimateUsed('custom');

    const dataLayer = queuedCommands(document);
    expect(dataLayer).toContainEqual([
      'event',
      'stl_report_downloaded',
      { tool: 'quality_check', format: 'pdf' },
    ]);
    expect(dataLayer).toContainEqual([
      'event',
      'stl_scale_calculated',
      { tool: 'dimensions_checker', target_dimension: 'height' },
    ]);
    expect(dataLayer).toContainEqual([
      'event',
      'stl_printer_fit_checked',
      { tool: 'dimensions_checker', fit_result: 'does_not_fit' },
    ]);
    expect(dataLayer).toContainEqual([
      'event',
      'stl_material_estimate_used',
      { tool: 'volume_calculator', material: 'custom' },
    ]);
  });

  it('tracks 3MF events without file-derived details', () => {
    const document = TestBed.inject(DOCUMENT);
    const consent = TestBed.inject(CookieConsentService);
    const analytics = TestBed.inject(AnalyticsService);
    consent.accept();
    TestBed.flushEffects();
    document
      .querySelector<HTMLScriptElement>(
        'script[src*="googletagmanager.com/gtag/js"]',
      )
      ?.dispatchEvent(new Event('load'));

    analytics.trackThreeMfQualityStarted(2 * 1024 * 1024);
    analytics.trackThreeMfQualityGenerated();
    analytics.trackThreeMfQualityFailed('processing_failed');
    analytics.trackThreeMfQualityReportDownloaded();

    const events = queuedCommands(document);
    expect(events).toContainEqual([
      'event',
      '3mf_quality_check_started',
      { file_size_bucket: '1_to_5mb' },
    ]);
    expect(events).toContainEqual([
      'event',
      '3mf_quality_report_generated',
      {},
    ]);
    expect(events).toContainEqual([
      'event',
      '3mf_quality_check_failed',
      { failure_category: 'processing_failed' },
    ]);
    expect(events).toContainEqual([
      'event',
      '3mf_quality_report_downloaded',
      {},
    ]);
    expect(JSON.stringify(events)).not.toContain('model.3mf');
  });
});
