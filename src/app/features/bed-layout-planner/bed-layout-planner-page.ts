import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PrinterProfileService } from '../../core/printer/printer-profile.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { readStl } from '../stl-reducer/stl-reducer';
import { resolveThreeMfWallGeometry } from '../shared/wall-thickness/three-mf-wall-thickness';
import { BedPart, planBedLayout } from './bed-layout';

@Component({
  selector: 'app-bed-layout-planner-page',
  imports: [RouterLink],
  templateUrl: './bed-layout-planner-page.html',
  styleUrl: './bed-layout-planner-page.scss',
})
export class BedLayoutPlannerPage {
  readonly routeUrl = PublicRouteUrl;
  readonly parts = signal<readonly BedPart[]>([]);
  readonly margin = signal(5);
  readonly bedWidth = signal(220);
  readonly bedDepth = signal(220);
  readonly error = signal('');
  readonly loading = signal(false);
  private readonly printers = inject(PrinterProfileService);
  readonly profile = computed(() => this.printers.profile());
  readonly bed = computed(() => {
    const profile = this.profile();
    return profile?.unit === 'mm'
      ? { width: profile.width, depth: profile.depth, saved: true }
      : { width: this.bedWidth(), depth: this.bedDepth(), saved: false };
  });
  readonly plan = computed(() =>
    planBedLayout(
      this.parts(),
      this.bed().width,
      this.bed().depth,
      this.margin(),
    ),
  );
  readonly bedUse = computed(() => {
    const plan = this.plan();
    const area = this.bed().width * this.bed().depth;
    const used = plan.placed.reduce(
      (total, part) => total + part.width * part.depth,
      0,
    );
    return { percentage: area ? (used / area) * 100 : 0 };
  });
  private readonly seo = inject(SeoService);
  constructor() {
    this.seo.apply({
      title: '3D Print Bed Layout Planner - Arrange STL and 3MF Parts',
      description:
        'Arrange multiple STL and 3MF model footprints on a saved 3D printer bed locally, with spacing and simple batch planning.',
      path: PublicRouteUrl.BedLayoutPlanner,
    });
  }
  openPicker(input: HTMLInputElement): void {
    input.click();
  }
  async chooseFiles(event: Event): Promise<void> {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    this.error.set('');
    if (!files.length) {
      return;
    }
    if (
      files.some(
        (file) =>
          !/\.(stl|3mf)$/i.test(file.name) ||
          !file.size ||
          file.size > getMaxFileUploadSizeLimit(),
      )
    ) {
      this.error.set('Choose non-empty STL or 3MF files up to 25 MiB.');
      return;
    }
    this.loading.set(true);
    try {
      const parts = await Promise.all(
        files.map(async (file) => {
          const geometry = file.name.toLowerCase().endsWith('.stl')
            ? await readStl(file)
            : (await resolveThreeMfWallGeometry(await file.arrayBuffer()))
                .geometry;
          const points = geometry.positions;
          let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
          for (let index = 0; index < points.length; index += 3) {
            minX = Math.min(minX, points[index]!);
            maxX = Math.max(maxX, points[index]!);
            minY = Math.min(minY, points[index + 1]!);
            maxY = Math.max(maxY, points[index + 1]!);
          }
          return { name: file.name, width: maxX - minX, depth: maxY - minY };
        }),
      );
      this.parts.update((current) => [...current, ...parts]);
    } catch {
      this.error.set('One or more files could not be read locally.');
    } finally {
      this.loading.set(false);
    }
  }
  setMargin(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value) && value >= 0) {
      this.margin.set(value);
    }
  }
  setBedDimension(axis: 'width' | 'depth', event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value) && value > 0) {
      (axis === 'width' ? this.bedWidth : this.bedDepth).set(value);
    }
  }
  clear(): void {
    this.parts.set([]);
  }
  format(value: number): string {
    return value.toFixed(1);
  }
}
