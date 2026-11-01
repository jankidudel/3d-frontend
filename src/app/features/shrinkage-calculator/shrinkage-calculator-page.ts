import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { SeoService } from '../../core/seo/seo.service';
import { calculateShrinkage } from './shrinkage-calculator';

import { RepeatReadings } from '../measurement-worksheet/repeat-readings';
import { MeasurementWorksheet } from '../measurement-worksheet/measurement-worksheet';
import {
  emptyReading,
  emptyWorksheetNotes,
  Reading,
  summarizeReadings,
} from '../measurement-worksheet/measurements';

const Axis = { X: 'x', Y: 'y', Z: 'z' } as const;
type Axis = (typeof Axis)[keyof typeof Axis];
const InputGroup = {
  Designed: 'designed',
  Target: 'target',
} as const;
type InputGroup = (typeof InputGroup)[keyof typeof InputGroup];

@Component({
  selector: 'app-shrinkage-calculator-page',
  imports: [RouterLink, RepeatReadings, MeasurementWorksheet],
  templateUrl: './shrinkage-calculator-page.html',
  styleUrl: './shrinkage-calculator-page.scss',
})
export class ShrinkageCalculatorPage {
  readonly guideRouteUrl = GuideRouteUrl;
  readonly routeUrl = PublicRouteUrl;
  readonly axes: readonly Axis[] = [Axis.X, Axis.Y, Axis.Z];
  readonly inputGroup = InputGroup;
  readonly notes = signal(emptyWorksheetNotes());
  readonly readings = {
    x: signal<readonly Reading[]>([emptyReading()]),
    y: signal<readonly Reading[]>([emptyReading()]),
    z: signal<readonly Reading[]>([emptyReading()]),
  };
  readonly statistics = computed(() => ({
    x: summarizeReadings(this.readings.x()),
    y: summarizeReadings(this.readings.y()),
    z: summarizeReadings(this.readings.z()),
  }));
  readonly designed = { x: signal(20), y: signal(20), z: signal(20) };

  readonly target = { x: signal(50), y: signal(50), z: signal(50) };
  readonly result = computed(() =>
    calculateShrinkage(
      {
        designed: this.designed.x(),
        measured: this.statistics().x?.mean ?? NaN,
        target: this.target.x(),
      },
      {
        designed: this.designed.y(),
        measured: this.statistics().y?.mean ?? NaN,
        target: this.target.y(),
      },
      {
        designed: this.designed.z(),
        measured: this.statistics().z?.mean ?? NaN,
        target: this.target.z(),
      },
    ),
  );

  readonly worksheet = computed(() => ({
    calculator: 'shrinkage',
    axes: Object.fromEntries(
      this.axes.map((axis) => [
        axis,
        {
          nominal: this.designed[axis](),
          target: this.target[axis](),
          readings: this.readings[axis](),
          statistics: this.statistics()[axis],
          outputs: this.result()[axis],
        },
      ]),
    ),
    assumptions:
      'Per-axis factor = designed dimension divided by mean of comparable included measurements. Missing axes remain unmeasured. Factors do not establish reliability or apply to local hole errors or another material/profile.',
  }));

  spreadCaution(axis: Axis): boolean {
    const stats = this.statistics()[axis];
    return (
      stats !== null &&
      stats.range > 0 &&
      stats.range >= Math.abs(this.designed[axis]() - stats.mean)
    );
  }

  constructor() {
    inject(SeoService).apply({
      title: '3D Print Shrinkage Calculator: Scale Compensation | InspectMesh',
      description:
        'Calculate measured 3D print shrinkage and per-axis CAD or slicer scale compensation from your own calibration print. Browser-local, with no universal material presets.',
      path: PublicRouteUrl.ShrinkageCalculator,
    });
  }

  setValue(
    group: typeof InputGroup.Designed | typeof InputGroup.Target,
    axis: Axis,
    event: Event,
  ): void {
    const text = (event.target as HTMLInputElement).value;
    const value = text.trim() === '' ? NaN : Number(text);
    this[group][axis].set(value);
  }

  reset(): void {
    this.notes.set(emptyWorksheetNotes());
    this.axes.forEach((axis) => {
      this.designed[axis].set(20);
      this.readings[axis].set([emptyReading()]);
      this.target[axis].set(50);
    });
  }

  format(value: number): string {
    return value.toFixed(3);
  }
}
