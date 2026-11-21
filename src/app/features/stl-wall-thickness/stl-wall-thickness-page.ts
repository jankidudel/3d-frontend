import { ExampleAsset } from '../examples/example-assets';
import { ExampleLoader } from '../examples/example-loader';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { Component, computed, inject, signal } from '@angular/core';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { readStl, StlMesh } from '../stl-reducer/stl-reducer';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import { wallThicknessLegend } from '../shared/wall-thickness/wall-thickness-legend';
import { WallThicknessSummaryComponent } from '../shared/wall-thickness/wall-thickness-summary';
import {
  validThreshold,
  WallThicknessReport,
  WallThicknessUnit,
} from '../shared/wall-thickness/wall-thickness-model';
import {
  loadWallThicknessEngine,
  WallThicknessEngine,
} from '../shared/wall-thickness/wall-thickness-engine-loader';

@Component({
  selector: 'app-stl-wall-thickness-page',
  templateUrl: './stl-wall-thickness-page.html',
  styleUrl: './stl-wall-thickness-page.scss',
  imports: [
    ObjectViewerComponent,
    ExampleLoader,
    WallThicknessSummaryComponent,
  ],
})
export class StlWallThicknessPage {
  readonly exampleAsset = ExampleAsset;
  readonly guideRouteUrl = GuideRouteUrl;
  readonly routeUrl = PublicRouteUrl;
  readonly file = signal<File | null>(null);
  readonly mesh = signal<StlMesh | null>(null);
  readonly assumedUnit = signal<WallThicknessUnit>(
    WallThicknessUnit.Millimetres,
  );
  readonly threshold = signal(1.2);
  readonly report = signal<WallThicknessReport | null>(null);
  readonly showHeatmap = signal(true);
  private readonly engine = signal<WallThicknessEngine | null>(null);
  readonly heatmap = computed(() => {
    const engine = this.engine();
    const mesh = this.mesh();
    const report = this.report();
    return engine && mesh && report && this.showHeatmap()
      ? engine.createWallThicknessHeatmap(mesh, report)
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
  readonly fileLimitMiB = getMaxFileUploadSizeLimit() / (1024 * 1024);
  readonly legend = wallThicknessLegend;
  readonly loadExample = async (files: readonly File[]) => {
    this.setUnit(WallThicknessUnit.Millimetres);
    this.setThreshold(1.2);
    await this.onFileSelected(files[0] ?? null);
  };
  private revision = 0;
  private readonly seo = inject(SeoService);
  constructor() {
    this.seo.apply({
      title: 'STL Wall Thickness Checker: Sample Thin Areas | InspectMesh',
      description:
        'Estimate sampled STL wall thickness in your browser. Set units and a review threshold, inspect thin or unmeasured samples, then verify critical features.',
      path: PublicRouteUrl.StlWallThicknessChecker,
    });
  }
  async onFileSelected(file: File | null): Promise<void> {
    const revision = ++this.revision;
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
        `This file is over the ${this.fileLimitMiB} MiB limit. Choose a smaller STL file.`,
      );
      return;
    }
    try {
      const mesh = await readStl(file);
      if (revision !== this.revision) {
        return;
      }
      this.mesh.set(mesh);
      this.file.set(file);
    } catch (error: unknown) {
      if (revision !== this.revision) {
        return;
      }
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
    input.value = '';
  }
  openPicker(input: HTMLInputElement): void {
    input.click();
  }
  setThreshold(value: number): void {
    this.revision++;
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
    const revision = ++this.revision;
    const threshold = this.threshold();
    const unit = this.assumedUnit();
    try {
      const engine = await loadWallThicknessEngine();
      this.engine.set(engine);
      await new Promise((resolve) => setTimeout(resolve));
      const result = engine.analyseWallThickness(mesh, threshold, unit);
      if (revision === this.revision) {
        this.report.set(result);
      }
    } finally {
      this.analysing.set(false);
    }
  }
  setUnit(unit: WallThicknessUnit): void {
    this.revision++;
    this.assumedUnit.set(unit);
    this.report.set(null);
  }
  formatBytes(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KiB`
      : `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  }
}
