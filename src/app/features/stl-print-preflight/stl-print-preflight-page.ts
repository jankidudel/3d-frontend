import { ExampleLoader } from '../examples/example-loader';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import {
  ReviewSession,
  ReviewDestination,
} from '../repeat-workflows/review-session';
import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PrinterProfileService } from '../../core/printer/printer-profile.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import {
  assessPrinterOrientations,
  ModelDimensions,
  ModelUnit,
} from '../../shared/model-dimensions';
import {
  analyseWallThickness,
  WallThicknessReport,
  WallThicknessUnit,
} from '../shared/wall-thickness/wall-thickness-analysis';
import { readStl, StlMesh } from '../stl-reducer/stl-reducer';
import {
  inspectMesh,
  meshDimensions,
  preflightActions,
  preflightStatus,
  UNIT_AMBIGUITY_MESSAGE,
  WALL_THICKNESS_LIMITATION_MESSAGE,
} from './stl-print-preflight-analysis';

@Component({
  selector: 'app-stl-print-preflight-page',
  imports: [ExampleLoader, ToolEvidenceComponent, RouterLink],
  templateUrl: './stl-print-preflight-page.html',
  styleUrl: './stl-print-preflight-page.scss',
})
export class StlPrintPreflightPage {
  readonly loadPublicExample = async (
    files: readonly File[],
  ): Promise<void> => {
    this.unit.set('mm');
    await this.onFileSelected(files[0]);
    if (this.error()) {
      throw new Error(this.error());
    }
  };
  readonly guideRouteUrl = GuideRouteUrl;
  readonly handoff = signal(
    inject(ReviewSession).take(ReviewDestination.Preflight),
  );
  readonly fromCollection = this.handoff() !== null;
  readonly routeUrl = PublicRouteUrl;
  readonly unitAmbiguityMessage = UNIT_AMBIGUITY_MESSAGE;
  readonly wallThicknessLimitationMessage = WALL_THICKNESS_LIMITATION_MESSAGE;
  private readonly printerProfileService = inject(PrinterProfileService);
  readonly printerProfile = computed(() =>
    this.printerProfileService.profile(),
  );
  readonly file = signal<File | null>(null);
  readonly mesh = signal<StlMesh | null>(null);
  readonly integrityReport = signal<ReturnType<typeof inspectMesh> | null>(
    null,
  );
  readonly dimensionsReport = signal<ModelDimensions | null>(null);
  readonly progress = signal('');
  readonly error = signal('');
  readonly analysing = signal(false);
  readonly unit = signal<ModelUnit>('mm');
  /** Printer fit is meaningful only after a custom printer profile is saved. */
  readonly buildVolume = computed(() => {
    const profile = this.printerProfile();
    return profile
      ? { width: profile.width, height: profile.height, depth: profile.depth }
      : null;
  });
  readonly integrity = computed(() => this.integrityReport());
  readonly dimensions = computed(() => this.dimensionsReport());
  readonly orientation = computed(() => {
    const dimensions = this.dimensions();
    const buildVolume = this.buildVolume();
    return dimensions && buildVolume
      ? assessPrinterOrientations(
          dimensions,
          this.unit(),
          buildVolume,
          this.printerProfile()?.unit ?? 'mm',
        )
      : null;
  });
  readonly wallReport = signal<WallThicknessReport | null>(null);
  readonly status = computed(() => {
    const integrity = this.integrity();
    if (!integrity) {
      return null;
    }
    return preflightStatus(
      integrity,
      (this.wallReport()?.belowThreshold ?? 0) > 0,
      this.orientation()?.recommended !== null
        ? true
        : this.orientation()
          ? false
          : null,
    );
  });
  readonly statusReason = computed(() => {
    const integrity = this.integrity();
    if (!integrity) {
      return '';
    }
    if (
      integrity.openEdges ||
      integrity.nonManifoldEdges ||
      integrity.degenerateTriangles ||
      integrity.orientationConflicts
    ) {
      return 'Mesh integrity findings need review before slicing.';
    }
    if ((this.wallReport()?.belowThreshold ?? 0) > 0) {
      return 'Sampled areas are below the generic 1.2 mm review threshold.';
    }
    if (!this.buildVolume()) {
      return 'Printer fit has not been checked because no custom printer profile is saved.';
    }
    if (integrity.duplicateTriangles) {
      return 'Duplicate triangles were found and should be reviewed.';
    }
    if (!integrity.volumeReliable) {
      return 'Solid volume is unavailable because component or orientation interpretation needs review.';
    }
    return 'No issue was found by the checks completed here.';
  });
  readonly actions = computed(() => {
    const integrity = this.integrity();
    const mesh = this.mesh();
    if (!integrity || !mesh) {
      return [];
    }
    return preflightActions(
      integrity,
      (this.wallReport()?.belowThreshold ?? 0) > 0,
      this.orientation()?.recommended !== null
        ? true
        : this.orientation()
          ? false
          : null,
      mesh.indices.length / 3,
    );
  });
  private readonly analytics = inject(AnalyticsService);
  private readonly seo = inject(SeoService);

  async openHandoff(): Promise<void> {
    const item = this.handoff();
    if (!item) {
      return;
    }
    this.handoff.set(null);
    this.unit.set(item.unit);
    await this.onFileSelected(item.file);
  }
  constructor() {
    this.seo.apply({
      title: 'STL Print Preflight Checker - Check Before Slicing | InspectMesh',
      description:
        'Run a local STL preflight before slicing: mesh integrity, dimensions, printer fit, sampled wall thickness, complexity and reliable volume guidance.',
      path: PublicRouteUrl.StlPrintPreflight,
    });
  }

  async runOwnedExample(): Promise<void> {
    try {
      const { exampleFile, MeshExample } =
        await import('../repeat-workflows/example-meshes');
      await this.onFileSelected(exampleFile(MeshExample.Cube));
    } catch (error: unknown) {
      this.reset();
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The example could not be loaded.',
      );
    }
  }
  async onFileSelected(file: File | null): Promise<void> {
    this.reset();
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.stl')) {
      this.error.set('Choose an STL file with a .stl extension.');
      return;
    }
    if (file.size === 0 || file.size > getMaxFileUploadSizeLimit()) {
      this.error.set(
        file.size === 0
          ? 'The selected STL file is empty.'
          : 'This file is over the 25 MiB limit. Choose a smaller STL file.',
      );
      return;
    }
    this.analytics.trackPreflightUploadStarted(file.size);
    this.file.set(file);
    this.analysing.set(true);
    try {
      this.progress.set('Reading mesh and dimensions...');
      const mesh = await readStl(file);
      await this.yieldToBrowser();
      this.progress.set('Checking mesh integrity and printer fit...');
      this.integrityReport.set(inspectMesh(mesh));
      this.dimensionsReport.set(meshDimensions(mesh));
      await this.yieldToBrowser();
      this.progress.set('Sampling wall thickness...');
      const report = analyseWallThickness(mesh, 1.2, this.wallUnit());
      this.wallReport.set(report);
      this.analytics.trackPreflightWallThickness(
        report ? 'completed' : 'skipped',
      );
      this.analytics.trackPreflightCompleted();
      this.mesh.set(mesh);
      this.progress.set('Preflight report ready.');
    } catch (error: unknown) {
      this.reset();
      this.error.set(
        error instanceof Error
          ? error.message
          : 'We could not analyse that STL file.',
      );
      this.analytics.trackPreflightWallThickness('failed');
    } finally {
      this.analysing.set(false);
    }
  }

  onPicker(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.onFileSelected(input.files?.item(0) ?? null);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    void this.onFileSelected(event.dataTransfer?.files.item(0) ?? null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  openPicker(input: HTMLInputElement): void {
    input.click();
  }

  setUnit(value: ModelUnit): void {
    this.unit.set(value);
    const mesh = this.mesh();
    if (mesh) {
      this.wallReport.set(analyseWallThickness(mesh, 1.2, this.wallUnit()));
    }
  }

  trackAction(): void {
    this.analytics.trackPreflightRemediationClicked();
  }

  reset(): void {
    this.file.set(null);
    this.mesh.set(null);
    this.integrityReport.set(null);
    this.dimensionsReport.set(null);
    this.wallReport.set(null);
    this.error.set('');
    this.progress.set('');
  }

  format(value: number): string {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  private wallUnit(): WallThicknessUnit {
    return this.unit() === 'in'
      ? WallThicknessUnit.Inches
      : this.unit() === 'cm'
        ? WallThicknessUnit.Centimetres
        : WallThicknessUnit.Millimetres;
  }

  private async yieldToBrowser(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve));
  }
}
