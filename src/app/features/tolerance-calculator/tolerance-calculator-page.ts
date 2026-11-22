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
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import {
  calculateCalibrationErrors,
  MatingMode,
  calculateTolerance,
  FitIntent,
  FIT_PRESETS,
  toleranceSummary,
} from './tolerance-calculator';

import { RepeatReadings } from '../measurement-worksheet/repeat-readings';
import { MeasurementWorksheet } from '../measurement-worksheet/measurement-worksheet';
import {
  emptyReading,
  emptyWorksheetNotes,
  Reading,
  summarizeReadings,
} from '../measurement-worksheet/measurements';

const FIT_LABELS: Record<FitIntent, string> = {
  [FitIntent.Clearance]: 'Clearance fit',
  [FitIntent.Sliding]: 'Close/sliding fit',
  [FitIntent.Snug]: 'Snug fit',
  [FitIntent.Interference]: 'Interference/press fit',
  [FitIntent.Custom]: 'Custom',
};

@Component({
  selector: 'app-tolerance-calculator-page',
  imports: [RouterLink, RepeatReadings, MeasurementWorksheet],
  templateUrl: './tolerance-calculator-page.html',
  styleUrl: './tolerance-calculator-page.scss',
})
export class ToleranceCalculatorPage {
  readonly guideRouteUrl = GuideRouteUrl;
  readonly matingModes = MatingMode;
  readonly matingMode = signal<MatingMode>(MatingMode.Fixed);
  readonly outsideReadings = signal<readonly Reading[]>([emptyReading()]);
  readonly holeReadings = signal<readonly Reading[]>([emptyReading()]);
  readonly notes = signal(emptyWorksheetNotes());
  readonly outsideStats = computed(() =>
    summarizeReadings(this.outsideReadings()),
  );
  readonly holeStats = computed(() => summarizeReadings(this.holeReadings()));
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
  readonly intendedHole = signal<number | null>(null);
  readonly appliedEvidence = signal<{
    readonly hole: {
      readonly nominal: number | null;
      readonly readings: readonly Reading[];
    };
    readonly pin: {
      readonly nominal: number | null;
      readonly readings: readonly Reading[];
    };
  } | null>(null);
  readonly copyStatus = signal('');
  readonly calibrationErrors = computed(() =>
    calculateCalibrationErrors({
      intendedOutside: this.intendedOutside(),
      measuredOutside: this.outsideStats()?.mean ?? null,
      intendedHole: this.intendedHole(),
      measuredHole: this.holeStats()?.mean ?? null,
    }),
  );
  readonly calibrationReady = computed(() => {
    const errors = this.calibrationErrors();
    const touched = (
      nominal: number | null,
      readings: readonly Reading[],
    ): boolean =>
      nominal !== null ||
      readings.length > 1 ||
      readings.some(
        (reading) =>
          reading.value !== null || !reading.included || !!reading.reason,
      );
    const holeIncomplete =
      touched(this.intendedHole(), this.holeReadings()) &&
      errors.holeError === null;
    const pinIncomplete =
      this.matingMode() === MatingMode.PrintedPair &&
      touched(this.intendedOutside(), this.outsideReadings()) &&
      errors.outsideError === null;
    return (
      !holeIncomplete &&
      !pinIncomplete &&
      (errors.holeError !== null ||
        (this.matingMode() === MatingMode.PrintedPair &&
          errors.outsideError !== null))
    );
  });
  readonly result = computed(() =>
    calculateTolerance({
      matingMode: this.matingMode(),
      nominalMatingDiameter: this.nominalMatingDiameter(),
      desiredPrintedPinDiameter: this.desiredPrintedPinDiameter(),
      desiredClearance: this.desiredClearance(),
      outsideError: this.outsideError(),
      holeError: this.holeError(),
    }),
  );
  readonly worksheet = computed(() => ({
    calculator: 'tolerance',
    matingMode: this.matingMode(),
    fitIntent: this.selectedIntent(),
    fixedCounterpartDiameter:
      this.matingMode() === MatingMode.Fixed
        ? this.nominalMatingDiameter()
        : null,
    desiredProducedPin:
      this.matingMode() === MatingMode.PrintedPair
        ? this.desiredPrintedPinDiameter()
        : null,
    diametralClearance: this.desiredClearance(),
    holeErrorApplied: this.holeError(),
    outsideErrorApplied:
      this.matingMode() === MatingMode.PrintedPair ? this.outsideError() : null,
    hole: {
      nominal: this.intendedHole(),
      readings: this.holeReadings(),
      statistics: this.holeStats(),
    },
    pin: {
      nominal: this.intendedOutside(),
      readings: this.outsideReadings(),
      statistics: this.outsideStats(),
    },
    calculatedErrors: this.calibrationErrors(),
    appliedEvidence: this.appliedEvidence(),
    outputs: this.result(),
    assumptions:
      'H = counterpart + C; model hole = H - eH; model pin = P - eP only for a printed pair. Errors are local additive assumptions for comparable size, orientation and process, not global scale. Applied errors may differ from the current readings until Apply is selected.',
  }));
  readonly validationMessage = computed(() => {
    if (
      this.matingMode() === MatingMode.Fixed
        ? this.nominalMatingDiameter() <= 0
        : this.desiredPrintedPinDiameter() <= 0
    ) {
      return 'The selected counterpart dimension must be positive.';
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
      title: '3D Print Tolerance Calculator: Hole and Pin Sizes | InspectMesh',
      description:
        'Calculate editable hole and pin model dimensions from a chosen 3D print fit and your own calibration measurements. Browser-local, with no fit guarantees.',
      path: PublicRouteUrl.ToleranceCalculator,
    });
  }

  setNumber(target: keyof ToleranceCalculatorPage, event: Event): void {
    const text = (event.target as HTMLInputElement).value.trim();
    const optional = [
      'outsideError',
      'holeError',
      'intendedOutside',
      'intendedHole',
    ].includes(target);
    const value = text === '' ? (optional ? null : NaN) : Number(text);
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
    if (!this.calibrationReady()) {
      return;
    }
    const errors = this.calibrationErrors();
    this.appliedEvidence.set({
      hole: { nominal: this.intendedHole(), readings: this.holeReadings() },
      pin: {
        nominal: this.intendedOutside(),
        readings: this.outsideReadings(),
      },
    });
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
        matingMode: this.matingMode(),
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
    this.matingMode.set(MatingMode.Fixed);
    this.holeReadings.set([emptyReading()]);
    this.outsideReadings.set([emptyReading()]);
    this.notes.set(emptyWorksheetNotes());
    this.appliedEvidence.set(null);
    this.selectedIntent.set(FitIntent.Clearance);
    this.selectedPreset.set('General assembly starting point');
    this.nominalMatingDiameter.set(10);
    this.desiredPrintedPinDiameter.set(10);
    this.desiredClearance.set(0.3);
    this.outsideError.set(null);
    this.holeError.set(null);
    this.intendedOutside.set(null);
    this.intendedHole.set(null);
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
