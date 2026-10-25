import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { ThreeMfFilePicker } from './threemf-file-picker';
import { ThreeMfQualityPage } from './threemf-quality-page';

const millimetresPerUnit: Record<string, number> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  meter: 1000,
  inch: 25.4,
  foot: 304.8,
};
@Component({
  selector: 'app-three-mf-volume-page',
  imports: [RouterLink, ThreeMfFilePicker, JobProgress],
  templateUrl: './threemf-volume-page.html',
  styleUrl: '../stl-volume/stl-volume-page.scss',
})
export class ThreeMfVolumePage extends ThreeMfQualityPage {
  private readonly volumeSeo = inject(SeoService);
  readonly density = signal(1.24);
  readonly volumeCm3 = computed(() => {
    const value = this.report()?.['volume'];
    const unit = this.report()?.['sourceUnit'];
    const factor = typeof unit === 'string' ? millimetresPerUnit[unit] : 1;
    return typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0 &&
      factor
      ? value * (factor / 10) ** 3
      : null;
  });
  readonly unreliable = computed(() => {
    const topology = this.report()?.['topology'] as
      Record<string, unknown> | undefined;
    const validation = this.report()?.['validation'] as
      Record<string, unknown> | undefined;
    return (
      validation?.['isValid'] !== true ||
      topology?.['openEdgeCount'] !== 0 ||
      topology?.['nonManifoldEdgeCount'] !== 0 ||
      topology?.['hasInconsistentOrientation'] === true
    );
  });
  readonly weight = computed(() => {
    const v = this.volumeCm3(),
      d = this.density();
    return v !== null && Number.isFinite(d) && d > 0 ? v * d : null;
  });
  constructor() {
    super();
    this.volumeSeo.apply({
      title: '3MF Volume Calculator: Build Volume and Solid Mass | InspectMesh',
      description:
        'Check supported 3MF volume results, understand unavailable values and calculate optional solid mass from density. Use slicer totals for consumption.',
      path: PublicRouteUrl.ThreeMfVolumeCalculator,
    });
  }
  setDensity(event: Event): void {
    this.density.set(Number((event.target as HTMLInputElement).value));
  }
}
