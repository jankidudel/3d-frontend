import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';

@Component({
  selector: 'app-flow-rate-calculator-page',
  imports: [ToolEvidenceComponent, RouterLink],
  templateUrl: './flow-rate-calculator-page.html',
  styleUrl: './flow-rate-calculator-page.scss',
})
export class FlowRateCalculatorPage {
  readonly routeUrl = PublicRouteUrl;
  readonly current = signal<number | null>(100);
  readonly expected = signal<number | null>(null);
  readonly measured = signal<number | null>(null);
  readonly repeats = signal<(number | null)[]>([null, null, null, null]);
  readonly useAverage = signal(false);
  readonly touched = signal(false);
  readonly measuredValue = computed(() => {
    const values = this.repeats().filter((v): v is number => v !== null);
    return this.useAverage() && values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : this.measured();
  });
  readonly error = computed(() =>
    [this.current(), this.expected(), this.measuredValue()].some(
      (v) => v === null || !Number.isFinite(v) || v <= 0 || v > 1000,
    )
      ? 'Enter finite values above zero and no more than 1,000.'
      : '',
  );
  readonly result = computed(() =>
    this.error()
      ? null
      : (this.current()! * this.expected()!) / this.measuredValue()!,
  );
  constructor() {
    inject(SeoService).apply({
      title: '3D Print Flow Rate Calculator | Calibrate Extrusion Multiplier',
      description:
        'Calculate a corrected 3D-printer flow rate or extrusion multiplier from a single-wall calibration print. Check the maths before changing your slicer profile.',
      path: PublicRouteUrl.FlowRateCalculator,
    });
  }
  set(key: 'current' | 'expected' | 'measured', event: Event): void {
    this.touched.set(true);
    const value = (event.target as HTMLInputElement).value.trim();
    this[key].set(value ? Number(value) : null);
  }
  setRepeat(index: number, event: Event): void {
    this.touched.set(true);
    const next = [...this.repeats()];
    const value = (event.target as HTMLInputElement).value.trim();
    next[index] = value ? Number(value) : null;
    this.repeats.set(next);
  }
  reset(): void {
    this.current.set(100);
    this.expected.set(null);
    this.measured.set(null);
    this.repeats.set([null, null, null, null]);
    this.useAverage.set(false);
    this.touched.set(false);
  }
  change(flow: number): string {
    return (flow - (this.current() ?? 0)).toFixed(1);
  }
  summary(flow: number): string {
    const difference =
      ((this.measuredValue() ?? 0) / (this.expected() ?? 1) - 1) * 100;
    return `The measured wall is ${Math.abs(difference).toFixed(1)}% ${difference >= 0 ? 'thicker' : 'thinner'} than expected, suggesting ${flow < (this.current() ?? 0) ? 'reducing' : 'increasing'} ${(this.current() ?? 0).toFixed(1)}% flow to ${flow.toFixed(1)}%.`;
  }
}
