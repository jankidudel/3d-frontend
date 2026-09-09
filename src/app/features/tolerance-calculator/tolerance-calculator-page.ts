import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import {
  calculateCalibrationErrors,
  calculateTolerance,
  FitIntent,
  FIT_PRESETS,
  toleranceSummary,
} from './tolerance-calculator';

const FIT_LABELS: Record<FitIntent, string> = {
  [FitIntent.Clearance]: 'Clearance fit',
  [FitIntent.Sliding]: 'Close/sliding fit',
  [FitIntent.Snug]: 'Snug fit',
  [FitIntent.Interference]: 'Interference/press fit',
  [FitIntent.Custom]: 'Custom',
};

@Component({
  selector: 'app-tolerance-calculator-page',
  imports: [RouterLink],
  templateUrl: './tolerance-calculator-page.html',
  styleUrl: './tolerance-calculator-page.scss',
})
export class ToleranceCalculatorPage {
  readonly routeUrl = PublicRouteUrl;
  readonly fitIntent = FitIntent;
  readonly fitLabels = FIT_LABELS;
  readonly presets = FIT_PRESETS;
  readonly selectedIntent = signal<FitIntent>(FitIntent.Clearance);
  readonly selectedPreset = signal('General assembly starting point');
  readonly nominalMatingDiameter = signal(10);
  readonly desiredPrintedPinDiameter = signal(10);
  readonly desiredClearance = signal(0.3);
  readonly outsideError = signal<number | null>(null);
  readonly holeError = signal<number | null>(null);
  readonly calibrationOpen = signal(false);
  readonly intendedOutside = signal<number | null>(null);
  readonly measuredOutside = signal<number | null>(null);
  readonly intendedHole = signal<number | null>(null);
  readonly measuredHole = signal<number | null>(null);
  readonly copyStatus = signal('');
  readonly calibrationErrors = computed(() =>
    calculateCalibrationErrors({
      intendedOutside: this.intendedOutside(),
      measuredOutside: this.measuredOutside(),
      intendedHole: this.intendedHole(),
      measuredHole: this.measuredHole(),
    }),
  );
  readonly result = computed(() =>
    calculateTolerance({
      nominalMatingDiameter: this.nominalMatingDiameter(),
      desiredPrintedPinDiameter: this.desiredPrintedPinDiameter(),
      desiredClearance: this.desiredClearance(),
      outsideError: this.outsideError(),
      holeError: this.holeError(),
    }),
  );
  readonly validationMessage = computed(() => {
    if (
      this.nominalMatingDiameter() <= 0 ||
      this.desiredPrintedPinDiameter() <= 0
    ) {
      return 'Nominal mating-part and desired printed pin dimensions must both be positive.';
    }
    if (this.result() === null) {
      return 'This combination would create a zero or negative target or modelled dimension. Adjust the dimension, clearance or measured error.';
    }
    return '';
  });
  private readonly analytics = inject(AnalyticsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    inject(SeoService).apply({
      title:
        '3D Print Tolerance & Clearance Calculator: Size Holes and Pins | InspectMesh',
      description:
        'Calculate editable hole and pin model dimensions from a chosen 3D print fit and your own calibration measurements. Browser-local, with no fit guarantees.',
      path: PublicRouteUrl.ToleranceCalculator,
    });
  }

  setNumber(target: keyof ToleranceCalculatorPage, event: Event): void {
    const text = (event.target as HTMLInputElement).value.trim();
    const value = text === '' ? null : Number(text);
    (this[target] as unknown as { set(value: number | null): void }).set(value);
  }

  chooseIntent(intent: FitIntent): void {
    this.selectedIntent.set(intent);
    this.selectedPreset.set('Custom');
    if (intent === FitIntent.Interference && this.desiredClearance() >= 0) {
      this.desiredClearance.set(-0.1);
    }
    this.analytics.trackToleranceCalculator(
      AnalyticsEvent.ToleranceCalculatorUsed,
    );
  }

  choosePreset(label: string): void {
    const preset = this.presets.find((candidate) => candidate.label === label);
    if (!preset) {
      return;
    }
    this.selectedPreset.set(label);
    this.selectedIntent.set(preset.intent);
    this.desiredClearance.set(preset.clearance);
    this.analytics.trackToleranceCalculator(
      AnalyticsEvent.ToleranceCalculatorUsed,
    );
  }

  applyCalibration(): void {
    const errors = this.calibrationErrors();
    this.outsideError.set(errors.outsideError);
    this.holeError.set(errors.holeError);
    this.analytics.trackToleranceCalculator(
      AnalyticsEvent.ToleranceCalibrationApplied,
    );
  }

  async copyDimensions(): Promise<void> {
    const result = this.result();
    if (!result || !this.isBrowser) {
      return;
    }
    const summary = toleranceSummary(
      {
        nominalMatingDiameter: this.nominalMatingDiameter(),
        desiredPrintedPinDiameter: this.desiredPrintedPinDiameter(),
        desiredClearance: this.desiredClearance(),
        outsideError: this.outsideError(),
        holeError: this.holeError(),
      },
      result,
      this.fitLabels[this.selectedIntent()],
    );
    try {
      await navigator.clipboard.writeText(summary);
      this.copyStatus.set('Dimensions copied to your clipboard.');
      this.analytics.trackToleranceCalculator(
        AnalyticsEvent.ToleranceResultCopied,
      );
    } catch {
      this.copyStatus.set(
        'Your browser could not copy the summary. Select and copy the text below.',
      );
    }
  }

  reset(): void {
    this.selectedIntent.set(FitIntent.Clearance);
    this.selectedPreset.set('General assembly starting point');
    this.nominalMatingDiameter.set(10);
    this.desiredPrintedPinDiameter.set(10);
    this.desiredClearance.set(0.3);
    this.outsideError.set(null);
    this.holeError.set(null);
    this.intendedOutside.set(null);
    this.measuredOutside.set(null);
    this.intendedHole.set(null);
    this.measuredHole.set(null);
    this.copyStatus.set('');
  }

  printSummary(): void {
    if (!this.isBrowser || this.result() === null) {
      return;
    }
    window.print();
  }

  openGuide(): void {
    this.analytics.trackToleranceCalculator(
      AnalyticsEvent.ToleranceGuideOpened,
    );
  }

  number(value: number | null): string {
    return value === null || !Number.isFinite(value)
      ? 'not entered'
      : `${value.toFixed(3)} mm`;
  }
}
