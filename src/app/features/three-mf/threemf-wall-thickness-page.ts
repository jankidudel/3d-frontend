import { ExampleAsset } from '../examples/example-assets';
import { ExampleLoader } from '../examples/example-loader';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { Component, computed, inject, signal } from '@angular/core';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import {
  validThreshold,
  WallThicknessReport,
  WallThicknessUnit,
} from '../shared/wall-thickness/wall-thickness-model';
import {
  loadWallThicknessEngine,
  WallThicknessEngine,
} from '../shared/wall-thickness/wall-thickness-engine-loader';
import { wallThicknessLegend } from '../shared/wall-thickness/wall-thickness-legend';
import { WallThicknessSummaryComponent } from '../shared/wall-thickness/wall-thickness-summary';
import {
  resolveThreeMfWallGeometry,
  ResolvedThreeMfGeometry,
} from '../shared/wall-thickness/three-mf-wall-thickness';

@Component({
  selector: 'app-three-mf-wall-thickness-page',
  imports: [
    ObjectViewerComponent,
    ExampleLoader,
    WallThicknessSummaryComponent,
  ],
  templateUrl: './threemf-wall-thickness-page.html',
  styleUrl: './threemf-wall-thickness-page.scss',
})
export class ThreeMfWallThicknessPage {
  readonly exampleAsset = ExampleAsset;
  readonly routeUrl = PublicRouteUrl;
  readonly guideRouteUrl = GuideRouteUrl;
  readonly file = signal<File | null>(null);
  readonly resolved = signal<ResolvedThreeMfGeometry | null>(null);
  readonly threshold = signal(1.2);
  readonly report = signal<WallThicknessReport | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showHeatmap = signal(true);
  readonly thresholdValid = computed(() => validThreshold(this.threshold()));
  readonly fileLimitMiB = getMaxFileUploadSizeLimit() / (1024 * 1024);
  private readonly engine = signal<WallThicknessEngine | null>(null);
  readonly heatmap = computed(() => {
    const engine = this.engine();
    const resolved = this.resolved();
    const report = this.report();
    return engine && resolved && report && this.showHeatmap()
      ? engine.createWallThicknessHeatmap(resolved.geometry, report)
      : null;
  });
  readonly legend = wallThicknessLegend;
  readonly loadExample = async (files: readonly File[]) => {
    this.setThreshold(0.6);
    await this.select(files[0] ?? null);
  };
  private revision = 0;
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: '3MF Wall Thickness Checker for Multi-Part Builds | InspectMesh',
      description:
        'Screen sampled wall thickness across the placed parts of a multi-part 3MF build. Check declared units, transforms, unmeasured samples and combined-scene limits.',
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
    const revision = ++this.revision;
    this.loading.set(false);
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
        `This file is over the ${this.fileLimitMiB} MiB limit. Choose a smaller 3MF file.`,
      );
      return;
    }
    this.loading.set(true);
    try {
      const resolved = await resolveThreeMfWallGeometry(
        await file.arrayBuffer(),
      );
      if (revision !== this.revision) {
        return;
      }
      this.resolved.set(resolved);
      this.file.set(file);
    } catch {
      if (revision !== this.revision) {
        return;
      }
      this.error.set(
        'We could not resolve this 3MF build locally. Choose a standard, unencrypted 3MF with supported mesh geometry and a declared supported unit.',
      );
    } finally {
      if (revision === this.revision) {
        this.loading.set(false);
      }
    }
  }
  async analyse(): Promise<void> {
    const resolved = this.resolved();
    if (!resolved || !this.thresholdValid()) {
      return;
    }
    const revision = this.revision;
    const engine = await loadWallThicknessEngine();
    if (revision !== this.revision || this.resolved() !== resolved) {
      return;
    }
    this.engine.set(engine);
    this.report.set(
      engine.analyseWallThickness(
        resolved.geometry,
        this.threshold(),
        WallThicknessUnit.Millimetres,
      ),
    );
  }
}
