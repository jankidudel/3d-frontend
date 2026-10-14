import { ExampleAsset } from '../examples/example-assets';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { Component, computed, inject, signal } from '@angular/core';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { readStl, StlMesh } from '../stl-reducer/stl-reducer';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import { createWallThicknessHeatmap } from '../shared/wall-thickness/wall-thickness-heatmap';
import {
  roundedThickness,
  wallThicknessOutcomeText,
} from '../shared/wall-thickness/wall-thickness-result';
import {
  analyseWallThickness,
  validThreshold,
  WallThicknessReport,
  WallThicknessUnit,
} from '../shared/wall-thickness/wall-thickness-analysis';

@Component({
  selector: 'app-stl-wall-thickness-page',
  templateUrl: './stl-wall-thickness-page.html',
  styleUrl: './stl-wall-thickness-page.scss',
  imports: [ToolEvidenceComponent, ObjectViewerComponent],
})
export class StlWallThicknessPage {
  readonly exampleAsset = ExampleAsset;
  readonly guideRouteUrl = GuideRouteUrl;
  readonly routeUrl = PublicRouteUrl;
  readonly unit = WallThicknessUnit;
  readonly file = signal<File | null>(null);
  readonly mesh = signal<StlMesh | null>(null);
  readonly assumedUnit = signal<WallThicknessUnit>(
    WallThicknessUnit.Millimetres,
  );
  readonly threshold = signal(1.2);
  readonly report = signal<WallThicknessReport | null>(null);
  readonly showHeatmap = signal(true);
  readonly heatmap = computed(() => {
    const mesh = this.mesh();
    const report = this.report();
    return mesh && report && this.showHeatmap()
      ? createWallThicknessHeatmap(mesh, report)
      : null;
  });
  readonly heatmapExtent = computed(() => {
    const mesh = this.mesh();
    if (!mesh) {
      return 1;
    }
    let minimum = Infinity;
    let maximum = -Infinity;
    for (const coordinate of mesh.positions) {
      minimum = Math.min(minimum, coordinate);
      maximum = Math.max(maximum, coordinate);
    }
    return Math.max(maximum - minimum, 1);
  });
  readonly error = signal('');
  readonly analysing = signal(false);
  readonly thresholdValid = computed(() => validThreshold(this.threshold()));
  private readonly seo = inject(SeoService);
  constructor() {
    this.seo.apply({
      title:
        'STL Wall Thickness Checker - Check Thin Walls Online | InspectMesh',
      description:
        'Estimate STL wall thickness locally in your browser, highlight sampled thin areas, and check whether a model needs closer print-preparation review.',
      path: PublicRouteUrl.StlWallThicknessChecker,
    });
  }
  async runOwnedExample(): Promise<void> {
    try {
      const { exampleFile, MeshExample } =
        await import('../repeat-workflows/example-meshes');
      await this.onFileSelected(exampleFile(MeshExample.Cube));
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The example could not be loaded.',
      );
    }
  }
  async onFileSelected(file: File | null): Promise<void> {
    this.error.set('');
    this.mesh.set(null);
    this.file.set(null);
    this.report.set(null);
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.stl')) {
      this.error.set('Choose an STL file with a .stl extension.');
      return;
    }
    if (file.size === 0) {
      this.error.set('The selected STL file is empty.');
      return;
    }
    if (file.size > getMaxFileUploadSizeLimit()) {
      this.error.set(
        'This file is over the 25 MiB limit. Choose a smaller STL file.',
      );
      return;
    }
    try {
      this.mesh.set(await readStl(file));
      this.file.set(file);
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'We could not read that STL file.',
      );
    }
  }
  onPicker(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.onFileSelected(input.files?.item(0) ?? null);
  }
  openPicker(input: HTMLInputElement): void {
    input.click();
  }
  setThreshold(value: number): void {
    this.threshold.set(value);
    this.report.set(null);
  }
  async analyse(): Promise<void> {
    const mesh = this.mesh();
    if (!mesh || !this.thresholdValid() || this.analysing()) {
      return;
    }
    this.analysing.set(true);
    this.report.set(null);
    try {
      await new Promise((resolve) => setTimeout(resolve));
      this.report.set(
        analyseWallThickness(mesh, this.threshold(), this.assumedUnit()),
      );
    } finally {
      this.analysing.set(false);
    }
  }
  format(value: number | null): string {
    return roundedThickness(value);
  }
  readonly outcome = wallThicknessOutcomeText;
  formatBytes(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KiB`
      : `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  }
}
