import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { calculateShrinkage } from './shrinkage-calculator';

type Axis = 'x' | 'y' | 'z';

@Component({
  selector: 'app-shrinkage-calculator-page',
  imports: [RouterLink],
  templateUrl: './shrinkage-calculator-page.html',
  styleUrl: './shrinkage-calculator-page.scss',
})
export class ShrinkageCalculatorPage {
  readonly routeUrl = PublicRouteUrl;
  readonly axes: readonly Axis[] = ['x', 'y', 'z'];
  readonly designed = { x: signal(20), y: signal(20), z: signal(20) };
  readonly measured = { x: signal(20), y: signal(20), z: signal(20) };
  readonly target = { x: signal(50), y: signal(50), z: signal(50) };
  readonly result = computed(() =>
    calculateShrinkage(
      {
        designed: this.designed.x(),
        measured: this.measured.x(),
        target: this.target.x(),
      },
      {
        designed: this.designed.y(),
        measured: this.measured.y(),
        target: this.target.y(),
      },
      {
        designed: this.designed.z(),
        measured: this.measured.z(),
        target: this.target.z(),
      },
    ),
  );

  constructor() {
    inject(SeoService).apply({
      title: '3D Print Shrinkage Calculator: Scale Compensation | InspectMesh',
      description:
        'Calculate measured 3D print shrinkage and per-axis CAD or slicer scale compensation from your own calibration print. Browser-local, with no universal material presets.',
      path: PublicRouteUrl.ShrinkageCalculator,
    });
  }

  setValue(
    group: 'designed' | 'measured' | 'target',
    axis: Axis,
    event: Event,
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    this[group][axis].set(value);
  }

  reset(): void {
    (['x', 'y', 'z'] as const).forEach((axis) => {
      this.designed[axis].set(20);
      this.measured[axis].set(20);
      this.target[axis].set(50);
    });
  }

  format(value: number): string {
    return value.toFixed(3);
  }
}
