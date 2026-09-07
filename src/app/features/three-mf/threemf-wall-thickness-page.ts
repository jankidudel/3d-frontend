import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import {
  analyseWallThickness,
  validThreshold,
  WallThicknessReport,
  WallThicknessUnit,
} from '../shared/wall-thickness/wall-thickness-analysis';
import { createWallThicknessHeatmap } from '../shared/wall-thickness/wall-thickness-heatmap';
import {
  roundedThickness,
  wallThicknessOutcomeText,
} from '../shared/wall-thickness/wall-thickness-result';
import {
  resolveThreeMfWallGeometry,
  ResolvedThreeMfGeometry,
} from '../shared/wall-thickness/three-mf-wall-thickness';

@Component({
  selector: 'app-three-mf-wall-thickness-page',
  imports: [ObjectViewerComponent, RouterLink],
  templateUrl: './threemf-wall-thickness-page.html',
  styleUrl: './threemf-wall-thickness-page.scss',
})
export class ThreeMfWallThicknessPage {
  readonly file = signal<File | null>(null);
  readonly resolved = signal<ResolvedThreeMfGeometry | null>(null);
  readonly threshold = signal(1.2);
  readonly report = signal<WallThicknessReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showHeatmap = signal(true);
  readonly thresholdValid = computed(() => validThreshold(this.threshold()));
  readonly heatmap = computed(() => {
    const resolved = this.resolved();
    const report = this.report();
    return resolved && report && this.showHeatmap()
      ? createWallThicknessHeatmap(resolved.geometry, report)
      : null;
  });
  readonly outcome = wallThicknessOutcomeText;
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title:
        '3MF Wall Thickness Checker - Check Thin Walls Online | InspectMesh',
      description:
        'Estimate resolved 3MF build wall thickness locally in your browser, including build-item transforms and repeated objects.',
      path: PublicRouteUrl.ThreeMfWallThicknessChecker,
    });
  }
  onPicker(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.select(input.files?.item(0) ?? null);
    input.value = '';
  }
  openPicker(input: HTMLInputElement): void {
    input.click();
  }
  setThreshold(value: number): void {
    this.threshold.set(value);
    this.report.set(null);
  }
  async select(file: File | null): Promise<void> {
    this.file.set(null);
    this.resolved.set(null);
    this.report.set(null);
    this.error.set('');
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.3mf')) {
      this.error.set('Choose a 3MF file with a .3mf extension.');
      return;
    }
    if (file.size === 0) {
      this.error.set('The selected 3MF file is empty.');
      return;
    }
    if (file.size > getMaxFileUploadSizeLimit()) {
      this.error.set(
        'This file is over the 25 MiB limit. Choose a smaller 3MF file.',
      );
      return;
    }
    this.loading.set(true);
    try {
      this.resolved.set(
        await resolveThreeMfWallGeometry(await file.arrayBuffer()),
      );
      this.file.set(file);
    } catch {
      this.error.set(
        'We could not resolve this 3MF build locally. Choose a standard, unencrypted 3MF with supported mesh geometry and a declared supported unit.',
      );
    } finally {
      this.loading.set(false);
    }
  }
  analyse(): void {
    const resolved = this.resolved();
    if (!resolved || !this.thresholdValid()) {
      return;
    }
    this.report.set(
      analyseWallThickness(
        resolved.geometry,
        this.threshold(),
        WallThicknessUnit.Millimetres,
      ),
    );
  }
  format(value: number | null): string {
    return roundedThickness(value);
  }
}
