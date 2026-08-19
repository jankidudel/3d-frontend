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

    analytics.trackEvent('upload_started', {
      file_type: 'stl',
      file_size_bucket: 'under_1mb',
    });

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

    script?.dispatchEvent(new Event('load'));
    analytics.trackEvent('upload_completed', {
      file_type: 'stl',
      file_size_bucket: '1_to_10mb',
    });

    expect(
      (document.defaultView as unknown as TestAnalyticsWindow).dataLayer,
    ).toContainEqual([
      'event',
      'upload_completed',
      { file_type: 'stl', file_size_bucket: '1_to_10mb' },
    ]);
  });
});
