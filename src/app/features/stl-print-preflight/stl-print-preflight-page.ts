import { assessProfileOrientations } from '../../core/printer/build-space';
import { printerDimensionsMm } from '../../core/printer/printer-profile.service';
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
import { ModelDimensions, ModelUnit } from '../../shared/model-dimensions';
import {
  WallThicknessReport,
  WallThicknessUnit,
} from '../shared/wall-thickness/wall-thickness-model';
import { readStl, StlMesh } from '../stl-reducer/stl-reducer';
import {
  inspectMesh,
  meshDimensions,
  preflightActions,
  preflightStatus,
  UNIT_AMBIGUITY_MESSAGE,
  WALL_THICKNESS_LIMITATION_MESSAGE,
} from './stl-print-preflight-analysis';
import {
  IntersectionCheckState,
  SelfIntersectionReport,
} from './self-intersection-model';
import { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-model';

/** The wall-thickness engine uses three.js, so it loads only once a file is checked. */
const loadWallThicknessAnalysis = () =>
  import('../shared/wall-thickness/wall-thickness-analysis');

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
  readonly intersectionReport = signal<SelfIntersectionReport | null>(null);
  readonly dimensionsReport = signal<ModelDimensions | null>(null);
  readonly progress = signal('');
  readonly error = signal('');
  readonly analysing = signal(false);
  readonly unit = signal<ModelUnit>('mm');
  /** Printer fit is meaningful only after a custom printer profile is saved. */
  readonly buildVolume = computed(() => {
    const profile = this.printerProfile();
    return profile ? printerDimensionsMm(profile) : null;
  });
  readonly integrity = computed(() => this.integrityReport());
  readonly dimensions = computed(() => this.dimensionsReport());
  readonly orientation = computed(() => {
    const dimensions = this.dimensions();
    const buildVolume = this.buildVolume();
    return dimensions && buildVolume
      ? assessProfileOrientations(
          dimensions,
          this.unit(),
          this.printerProfile(),
        )
      : null;
  });
  readonly wallReport = signal<WallThicknessReport | null>(null);
  readonly status = computed(() => {
    const integrity = this.integrity();
    if (!integrity) {
      return null;
    }
    const baseStatus = preflightStatus(
      integrity,
      (this.wallReport()?.belowThreshold ?? 0) > 0,
      this.orientation() ? this.orientation()!.recommended !== null : null,
    );
    const intersection = this.intersectionReport();
    if (
      intersection?.state === IntersectionCheckState.Found &&
      intersection.findings.some((finding) => finding.kind === 'crossing')
    ) {
      return 'Needs attention';
    }
    if (
      (!intersection ||
        intersection.state === IntersectionCheckState.Skipped ||
        intersection.state === IntersectionCheckState.Incomplete ||
        intersection.findings.some(
          (finding) => finding.kind === 'ambiguous',
        )) &&
      baseStatus === 'No issue found in this check'
    ) {
      return 'Check before slicing';
    }
    return baseStatus;
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
    const intersection = this.intersectionReport();
    if (
      intersection?.state === IntersectionCheckState.Found &&
      intersection.findings.some((finding) => finding.kind === 'crossing')
    ) {
      return 'Triangle surfaces cross in this check. Review the affected pair in the finding list.';
    }
    if (
      !intersection ||
      intersection.state === IntersectionCheckState.Skipped ||
      intersection.state === IntersectionCheckState.Incomplete ||
      intersection.findings.some((finding) => finding.kind === 'ambiguous')
    ) {
      return (
        intersection?.reason ??
        'Triangle intersection review is incomplete or ambiguous.'
      );
    }
    if ((this.wallReport()?.belowThreshold ?? 0) > 0) {
      return 'Sampled areas are below the generic 1.2 mm review threshold.';
    }
    if (!this.buildVolume()) {
      return 'Printer envelope unavailable: no confirmed X/Y/Z and shape profile is active. Review saved legacy axes or enter and save a usable region.';
    }
    if (this.orientation() && !this.orientation()!.recommended) {
      return 'No tested right-angle envelope is contained in the confirmed region. Empty envelope corners can conservatively reject an irregular outline; review orientation, shape and process space.';
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
      this.orientation() ? this.orientation()!.recommended !== null : null,
      mesh.indices.length / 3,
    );
  });
  private readonly analytics = inject(AnalyticsService);
  private readonly seo = inject(SeoService);
  private intersectionWorker: Worker | null = null;
  private rejectIntersection: ((error: Error) => void) | null = null;
  private analysisGeneration = 0;

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
    const generation = this.analysisGeneration;
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
      if (generation !== this.analysisGeneration) {
        return;
      }
      await this.yieldToBrowser();
      this.progress.set('Checking mesh integrity and printer fit...');
      this.integrityReport.set(inspectMesh(mesh));
      this.progress.set('Checking triangle intersections...');
      this.intersectionReport.set(await this.checkIntersections(mesh));
      if (generation !== this.analysisGeneration) {
        return;
      }
      this.dimensionsReport.set(meshDimensions(mesh));
      await this.yieldToBrowser();
      this.progress.set('Sampling wall thickness...');
      const { analyseWallThickness } = await loadWallThicknessAnalysis();
      if (generation !== this.analysisGeneration) {
        return;
      }
      const report = analyseWallThickness(mesh, 1.2, this.wallUnit());
      this.wallReport.set(report);
      this.analytics.trackPreflightWallThickness(
        report ? 'completed' : 'skipped',
      );
      this.analytics.trackPreflightCompleted();
      this.mesh.set(mesh);
      this.progress.set('Preflight report ready.');
    } catch (error: unknown) {
      if (generation !== this.analysisGeneration) {
        return;
      }
      this.reset();
      this.error.set(
        error instanceof Error
          ? error.message
          : 'We could not analyse that STL file.',
      );
      this.analytics.trackPreflightWallThickness('failed');
    } finally {
      if (generation === this.analysisGeneration) {
        this.analysing.set(false);
      }
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
      void this.refreshWallReport(mesh);
    }
  }

  private async refreshWallReport(
    mesh: IndexedTriangleGeometry,
  ): Promise<void> {
    const { analyseWallThickness } = await loadWallThicknessAnalysis();
    if (this.mesh() === mesh) {
      this.wallReport.set(analyseWallThickness(mesh, 1.2, this.wallUnit()));
    }
  }

  trackAction(): void {
    this.analytics.trackPreflightRemediationClicked();
  }

  reset(): void {
    this.analysisGeneration += 1;
    this.cancelIntersectionCheck();
    this.file.set(null);
    this.mesh.set(null);
    this.integrityReport.set(null);
    this.intersectionReport.set(null);
    this.dimensionsReport.set(null);
    this.wallReport.set(null);
    this.error.set('');
    this.progress.set('');
    this.analysing.set(false);
  }

  private checkIntersections(
    mesh: IndexedTriangleGeometry,
  ): Promise<SelfIntersectionReport> {
    this.cancelIntersectionCheck();
    const worker = new Worker(
      new URL('./self-intersections.worker', import.meta.url),
      { type: 'module' },
    );
    this.intersectionWorker = worker;
    return new Promise((resolve, reject) => {
      this.rejectIntersection = reject;
      worker.onmessage = (event: MessageEvent<SelfIntersectionReport>) => {
        this.intersectionWorker = null;
        this.rejectIntersection = null;
        worker.terminate();
        resolve(event.data);
      };
      worker.onerror = () => {
        this.intersectionWorker = null;
        this.rejectIntersection = null;
        worker.terminate();
        resolve({
          state: IntersectionCheckState.Incomplete,
          findings: [],
          reason: 'The background triangle intersection check failed.',
          candidatePairs: 0,
        });
      };
      const positions = new Float32Array(mesh.positions);
      const indices = new Uint32Array(mesh.indices);
      worker.postMessage({ positions, indices }, [
        positions.buffer,
        indices.buffer,
      ]);
    });
  }

  private cancelIntersectionCheck(): void {
    if (!this.intersectionWorker) {
      return;
    }
    this.intersectionWorker.terminate();
    this.intersectionWorker = null;
    const reject = this.rejectIntersection;
    this.rejectIntersection = null;
    reject?.(new Error('The previous intersection check was cancelled.'));
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
