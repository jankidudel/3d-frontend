import { DestroyRef } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import {
  displayNumber,
  displayVector,
  displayBounds,
  NUMERIC_DISPLAY_NOTE,
} from '../../shared/numeric-display';
import { geometryBounds } from '../shared/wall-thickness/three-mf-wall-thickness';
import {
  ReductionMethod,
  ComparisonState,
  MAX_CANDIDATES,
  comparisonLimit,
  type ReviewedCandidate,
} from './candidate-review';
import {
  ModelUnits,
  type SurfaceDifference,
} from '../repeat-workflows/mesh-workflows';
import { runMeshWorker, MeshWorkerMode } from '../repeat-workflows/mesh-worker';
import { ExampleLoader } from '../examples/example-loader';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import { StlMesh } from './stl-reducer';

type Mode = ReductionMethod;
export const PreviewVersion = {
  Original: 'original',
  Reduced: 'reduced',
  Overlay: 'overlay',
} as const;
type PreviewVersion = (typeof PreviewVersion)[keyof typeof PreviewVersion];
interface Result extends ReviewedCandidate {
  readonly id: number;
  readonly sourceId: number;
  readonly comparisonState: ComparisonState;
  readonly comparison: SurfaceDifference | null;
  readonly comparisonError: string;
  readonly unit: ModelUnits;
  readonly acknowledged: boolean;
  readonly notes: string;
}
interface PreviewModel {
  readonly extent: number;
  readonly object: import('three').Object3D;
}

@Component({
  selector: 'app-stl-reducer-page',
  imports: [NgOptimizedImage, ExampleLoader, RouterLink, ObjectViewerComponent],
  templateUrl: './stl-reducer-page.html',
  styleUrl: './stl-reducer-page.scss',
})
export class StlReducerPage {
  readonly loadPublicExample = async (
    files: readonly File[],
  ): Promise<void> => {
    await this.onFileSelected(files[0]);
    this.mode.set(
      files[0].name.includes('coupon') || files[0].name.includes('rib')
        ? ReductionMethod.Reduction
        : ReductionMethod.Encoding,
    );
    this.keepPercent.set(75);
    if (this.error()) {
      throw new Error(this.error());
    }
  };
  readonly guideRouteUrl = GuideRouteUrl;
  readonly routeUrl = PublicRouteUrl;
  readonly previewVersion = PreviewVersion;
  readonly methods = ReductionMethod;
  readonly displayNumber = displayNumber;
  readonly displayVector = displayVector;
  readonly displayBounds = displayBounds;
  readonly numericNote = NUMERIC_DISPLAY_NOTE;
  readonly candidates = signal<readonly Result[]>([]);
  readonly units = ModelUnits;
  readonly unit = signal<ModelUnits>(ModelUnits.Millimetres);
  readonly tolerance = signal(0.1);
  readonly comparing = signal(false);
  readonly sourceBounds = computed(() =>
    this.source() ? geometryBounds(this.source()!) : null,
  );
  readonly limit = computed(() =>
    this.result() && this.source() && this.file()
      ? comparisonLimit(
          this.file()!.size,
          this.result()!.blob.size,
          this.source()!,
          this.result()!.mesh,
        )
      : '',
  );
  private generation = 0;
  private workVersion = 0;
  private nextId = 0;
  private previewRequest = 0;
  private worker: Worker | null = null;
  private rejectWork: ((error: Error) => void) | null = null;
  private controller: AbortController | null = null;
  readonly file = signal<File | null>(null);
  readonly source = signal<StlMesh | null>(null);
  readonly result = signal<Result | null>(null);
  readonly mode = signal<Mode>(ReductionMethod.Encoding);
  readonly keepPercent = signal(75);
  readonly customTarget = signal<number | null>(null);
  readonly targetValid = signal(true);
  readonly error = signal('');
  readonly processing = signal(false);
  readonly preview = signal<PreviewVersion>(PreviewVersion.Original);
  readonly previewModel = signal<PreviewModel | null>(null);
  readonly sourceTopology = signal<Result['topology']>(null);
  readonly sourceMetrics = computed(() => {
    const mesh = this.source();
    const file = this.file();
    const bounds = this.sourceBounds();
    return mesh && file && bounds
      ? {
          bytes: file.size,
          dimensions: bounds.spans,
          triangleCount: mesh.indices.length / 3,
          warnings: [],
        }
      : null;
  });
  readonly resultMetrics = computed(() => {
    const result = this.result();
    return result
      ? {
          bytes: result.blob.size,
          dimensions: result.bounds.spans,
          triangleCount: result.mesh.indices.length / 3,
          warnings: [],
        }
      : null;
  });
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.cancel();
      this.disposePreview();
    });
    this.seo.apply({
      title:
        'STL File Size Reducer: Compress and Simplify STL Files | InspectMesh',
      description:
        'Reduce STL file size online. Convert ASCII STL to compact binary STL or simplify a dense mesh with before-and-after triangle counts and size comparison.',
      path: PublicRouteUrl.StlFileSizeReducer,
    });
  }
  async onFileSelected(file: File | null): Promise<void> {
    if (!file) {
      return;
    }
    this.reset();
    const generation = this.workVersion;
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
      this.processing.set(true);
      const loaded = await this.runWorker({
        file,
        method: ReductionMethod.Encoding,
        keepPercent: 100,
      });
      if (generation !== this.workVersion) {
        return;
      }
      this.source.set(loaded.mesh!);
      this.sourceTopology.set(loaded.topology ?? null);
      this.file.set(file);
      this.preview.set(PreviewVersion.Original);
      await this.showPreview(this.source()!);
      this.analytics.trackReducer(AnalyticsEvent.ReducerFileSelected);
    } catch (error: unknown) {
      if (generation !== this.workVersion) {
        return;
      }
      this.file.set(null);
      this.source.set(null);
      this.error.set(
        error instanceof Error
          ? error.message
          : 'We could not read that STL file.',
      );
    } finally {
      if (generation === this.workVersion) {
        this.processing.set(false);
      }
    }
  }
  openPicker(input: HTMLInputElement): void {
    input.click();
  }
  onPicker(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.onFileSelected(input.files?.item(0) ?? null);
  }
  setPreset(percent: number): void {
    this.customTarget.set(null);
    this.targetValid.set(true);
    this.keepPercent.set(percent);
    this.analytics.trackReducer(AnalyticsEvent.ReducerPresetSelected);
  }
  setCustom(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (
      !Number.isInteger(value) ||
      value < 1 ||
      !this.source() ||
      value >= this.source()!.indices.length / 3
    ) {
      this.targetValid.set(false);
      this.error.set(
        'Enter a whole target triangle count between 1 and one less than the source count.',
      );
      return;
    }
    this.error.set('');
    this.targetValid.set(true);
    this.customTarget.set(value);
    this.keepPercent.set((value / (this.source()!.indices.length / 3)) * 100);
  }
  private runWorker(request: {
    file?: File;
    source?: StlMesh;
    method: ReductionMethod;
    keepPercent: number;
    requestedTriangles?: number;
  }): Promise<{
    mesh?: StlMesh;
    candidate?: ReviewedCandidate;
    topology?: Result['topology'];
  }> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('./candidate.worker', import.meta.url),
        { type: 'module' },
      );
      this.worker = worker;
      this.rejectWork = reject;
      const finish = () => {
        worker.terminate();
        if (this.worker === worker) {
          this.worker = null;
          this.rejectWork = null;
        }
      };
      worker.onmessage = ({ data }) => {
        finish();
        if (data.error) {
          reject(new Error(data.error));
        } else {
          resolve(data);
        }
      };
      worker.onerror = () => {
        finish();
        reject(
          new Error('Local worker could not complete. Try a smaller file.'),
        );
      };
      worker.postMessage(request);
    });
  }
  async process(): Promise<void> {
    const source = this.source();
    if (
      !source ||
      (this.mode() === ReductionMethod.Reduction && !this.targetValid()) ||
      this.processing() ||
      this.candidates().length >= MAX_CANDIDATES
    ) {
      return;
    }
    this.cancelComparison();
    const generation = this.workVersion;
    const method = this.mode();
    const keepPercent = this.keepPercent();
    const requestedTriangles = this.customTarget() ?? undefined;
    this.error.set('');
    this.processing.set(true);
    try {
      const output = await this.runWorker({
        source,
        method,
        keepPercent,
        requestedTriangles,
      });
      if (generation !== this.workVersion || !output.candidate) {
        return;
      }
      const limitMessage = comparisonLimit(
        this.file()!.size,
        output.candidate.blob.size,
        source,
        output.candidate.mesh,
      );
      const candidate: Result = {
        ...output.candidate,
        id: ++this.nextId,
        sourceId: this.generation,
        comparisonState: limitMessage
          ? ComparisonState.Limited
          : ComparisonState.NotRun,
        comparison: null,
        comparisonError: limitMessage,
        unit: this.unit(),
        acknowledged: false,
        notes: '',
      };
      this.candidates.update((items) => [...items, candidate]);
      await this.selectCandidate(candidate.id);
    } catch (error: unknown) {
      if (generation === this.workVersion) {
        this.error.set(
          error instanceof Error ? error.message : 'Candidate unavailable.',
        );
      }
    } finally {
      if (generation === this.workVersion) {
        this.processing.set(false);
      }
    }
  }
  async selectCandidate(id: number): Promise<void> {
    this.cancelComparison();
    const candidate = this.candidates().find((item) => item.id === id);
    this.result.set(candidate ?? null);
    if (candidate) {
      await this.showReduced();
    }
  }
  removeCandidate(id: number): void {
    this.cancelComparison();
    this.candidates.update((items) => items.filter((item) => item.id !== id));
    if (this.result()?.id === id) {
      this.result.set(null);
      void this.showOriginal();
    }
  }
  updateCandidate(update: Partial<Result>): void {
    const id = this.result()?.id;
    this.candidates.update((items) =>
      items.map((item) => (item.id === id ? { ...item, ...update } : item)),
    );
    this.result.set(this.candidates().find((item) => item.id === id) ?? null);
  }
  changeUnit(event: Event): void {
    this.cancelComparison();
    this.unit.set((event.target as HTMLSelectElement).value as ModelUnits);
    this.candidates.update((items) =>
      items.map((item) => ({
        ...item,
        comparison: null,
        comparisonState: ComparisonState.NotRun,
        unit: this.unit(),
      })),
    );
    this.result.set(
      this.candidates().find((item) => item.id === this.result()?.id) ?? null,
    );
  }
  changeTolerance(event: Event): void {
    this.cancelComparison();
    this.tolerance.set(Number((event.target as HTMLInputElement).value));
    this.candidates.update((items) =>
      items.map((item) => ({
        ...item,
        comparison: null,
        comparisonState: ComparisonState.NotRun,
      })),
    );
    this.result.set(
      this.candidates().find((item) => item.id === this.result()?.id) ?? null,
    );
  }
  async compareSelected(): Promise<void> {
    const candidate = this.result();
    const source = this.source();
    if (!candidate || !source || this.comparing()) {
      return;
    }
    if (this.limit()) {
      this.updateCandidate({
        comparisonState: ComparisonState.Limited,
        comparisonError: this.limit(),
      });
      return;
    }
    if (!Number.isFinite(this.tolerance()) || this.tolerance() < 0) {
      this.error.set('Enter a finite nonnegative tolerance in millimetres.');
      return;
    }
    const controller = new AbortController();
    this.controller = controller;
    this.comparing.set(true);
    const scale = this.unit() === ModelUnits.Inches ? 25.4 : 1;
    const scaled = (mesh: StlMesh) => ({
      positions: mesh.positions.map((value) => value * scale),
      indices: mesh.indices,
    });
    try {
      const response = await runMeshWorker(
        {
          mode: MeshWorkerMode.Compare,
          before: scaled(source),
          after: scaled(candidate.mesh),
          tolerance: this.tolerance(),
        },
        controller.signal,
      );
      if (
        !controller.signal.aborted &&
        this.result()?.id === candidate.id &&
        candidate.sourceId === this.generation
      ) {
        this.updateCandidate({
          comparison: response.difference ?? null,
          comparisonState: response.difference
            ? ComparisonState.Completed
            : ComparisonState.Failed,
          comparisonError: '',
        });
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted && this.result()?.id === candidate.id) {
        this.updateCandidate({
          comparisonState: ComparisonState.Failed,
          comparisonError:
            error instanceof Error ? error.message : 'Comparison unavailable.',
        });
      }
    } finally {
      if (this.controller === controller) {
        this.comparing.set(false);
        this.controller = null;
      }
    }
  }
  cancelComparison(): void {
    if (this.comparing()) {
      this.controller?.abort();
      this.updateCandidate({
        comparison: null,
        comparisonState: ComparisonState.Cancelled,
      });
    }
    this.controller = null;
    this.comparing.set(false);
  }
  cancel(): void {
    ++this.workVersion;
    this.worker?.terminate();
    this.worker = null;
    this.rejectWork?.(new Error('Processing cancelled.'));
    this.rejectWork = null;
    this.processing.set(false);
    this.cancelComparison();
  }
  private save(blob: Blob, name: string): void {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
  }
  download(): void {
    const result = this.result();
    if (
      !result ||
      !this.file() ||
      (result.regressions.length > 0 && !result.acknowledged)
    ) {
      return;
    }
    this.save(
      result.blob,
      `${this.file()!.name.replace(/\.stl$/i, '')}-candidate-${result.id}-${result.regressions.length ? 'diagnostic' : result.method}.stl`,
    );
  }
  report() {
    const candidate = this.result();
    if (!candidate || !this.file()) {
      return null;
    }
    return {
      schema: 'inspectmesh-reducer-review-1',
      source: {
        label: this.file()!.name,
        bytes: this.file()!.size,
        sessionIdentity: this.generation,
        triangles: this.sourceMetrics()!.triangleCount,
        bounds: this.sourceBounds(),
        assumedUnit: this.unit(),
      },
      selectedCandidate: candidate.id,
      operation: candidate.method,
      requestedKeptPercent: candidate.keepPercent,
      requestedTriangles: candidate.requestedTriangles,
      algorithm: candidate.algorithm,
      output: {
        bytes: candidate.blob.size,
        triangles: candidate.mesh.indices.length / 3,
        bounds: candidate.bounds,
        bytesSavedAgainstOriginal: this.file()!.size - candidate.blob.size,
      },
      integrity: candidate.integrity,
      maximumSourceFloat32StorageError: candidate.storageError,
      originalTopology: candidate.originalTopology,
      candidateTopology: candidate.topology,
      newFindingCounts: candidate.regressions,
      unavailable: [
        ...(!candidate.topology
          ? ['Topology unavailable above 100,000 triangles.']
          : []),
        'Self intersections, defect locations, design intent and print success are not checked.',
        'STL stored normal and attribute data are not retained; integrity checks oriented triangle coordinates under Float32 storage.',
      ],
      comparisonState: candidate.comparisonState,
      comparisonError: candidate.comparisonError,
      comparison: candidate.comparison
        ? {
            method: candidate.comparison.method,
            samplesPerDirection: candidate.comparison.samplesPerDirection,
            toleranceMm: candidate.comparison.toleranceMm,
            maximumSampledMm: candidate.comparison.maximumSampledMm,
            meanSampledMm: candidate.comparison.meanSampledMm,
            samplesOverTolerance: candidate.comparison.samplesOverTolerance,
            forward: candidate.comparison.forwardSummary,
            reverse: candidate.comparison.reverseSummary,
            unitBasis: this.unit(),
            alignment: 'original coordinates',
            translationMm: [0, 0, 0],
            methodVersion:
              'inspectmesh-surface-sampling-1 / three-mesh-bvh 0.9.8',
            limitations:
              'Finite sampled maximum is not a whole-surface upper bound.',
          }
        : null,
      diagnosticAcknowledged: candidate.acknowledged,
      userReviewNotes: candidate.notes,
      precision: NUMERIC_DISPLAY_NOTE,
      nextAction:
        'Keep the original. Review holes, mating faces, ribs, lettering and silhouette; reopen in the receiving application using the same assumed units. No candidate is certified safe or repaired.',
    };
  }
  exportReport(): void {
    this.save(
      new Blob([JSON.stringify(this.report(), null, 2)], {
        type: 'application/json',
      }),
      'inspectmesh-candidate-report.json',
    );
  }
  reportText(): string {
    return JSON.stringify(
      this.report(),
      (_key, value: unknown) =>
        typeof value === 'number' ? displayNumber(value) : value,
      2,
    );
  }
  async copyReport(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.reportText());
    } catch {
      this.error.set(
        'Clipboard unavailable. Download the JSON report instead.',
      );
    }
  }
  printReport(): void {
    window.print();
  }
  acknowledge(event: Event): void {
    this.updateCandidate({
      acknowledged: (event.target as HTMLInputElement).checked,
    });
  }
  reviewNotes(event: Event): void {
    this.updateCandidate({
      notes: (event.target as HTMLTextAreaElement).value,
    });
  }
  reset(): void {
    ++this.generation;
    this.cancel();
    this.file.set(null);
    this.source.set(null);
    this.sourceTopology.set(null);
    this.result.set(null);
    this.candidates.set([]);
    this.customTarget.set(null);
    this.targetValid.set(true);
    this.error.set('');
    this.preview.set(PreviewVersion.Original);
    this.disposePreview();
  }
  async showOriginal(): Promise<void> {
    const source = this.source();
    if (source) {
      this.preview.set(PreviewVersion.Original);
      await this.showPreview(source);
    }
  }
  async showReduced(): Promise<void> {
    const result = this.result();
    if (result) {
      this.preview.set(PreviewVersion.Reduced);
      await this.showPreview(result.mesh);
    }
  }
  async showOverlay(): Promise<void> {
    const result = this.result();
    if (result && this.source()) {
      this.preview.set(PreviewVersion.Overlay);
      await this.showPreview(result.mesh, true);
    }
  }
  private disposePreview(): void {
    this.previewModel()?.object.traverse((item) => {
      const mesh = item as import('three').Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.previewModel.set(null);
  }
  boundsDeltaText(bounds: Result['bounds']): string {
    const original = this.sourceBounds()!;
    return `Min ${displayVector(bounds.min.map((value, axis) => value - original.min[axis]))}; max ${displayVector(bounds.max.map((value, axis) => value - original.max[axis]))}`;
  }
  spanDeltaText(spans: readonly number[]): string {
    return displayVector(
      spans.map((value, axis) => value - this.sourceBounds()!.spans[axis]),
    );
  }
  topologyText(topology: Result['topology']): string {
    return topology
      ? `Boundary edges ${topology.openEdges}; over-shared edges ${topology.nonManifoldEdges}; duplicates ${topology.duplicateTriangles}; degenerates ${topology.degenerateTriangles}; winding conflicts ${topology.orientationConflicts}; shells ${topology.shells}`
      : 'Unavailable above the 100,000-triangle analysis budget';
  }
  directionText(summary: SurfaceDifference['forwardSummary']): string {
    return `${summary.samples} samples; maximum ${displayNumber(summary.maximumSampledMm, true)} mm; mean ${displayNumber(summary.meanSampledMm, true)} mm; ${summary.samplesOverTolerance} exceedances`;
  }
  formatBytes(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KiB`
      : `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  }
  formatDimensions(dimensions: readonly number[]): string {
    return displayVector(dimensions, ' × ');
  }
  private async showPreview(mesh: StlMesh, overlay = false): Promise<void> {
    const generation = this.generation;
    const request = ++this.previewRequest;
    const three = await import('three');
    if (generation !== this.generation || request !== this.previewRequest) {
      return;
    }
    this.disposePreview();
    const geometry = new three.BufferGeometry();
    geometry.setAttribute(
      'position',
      new three.BufferAttribute(mesh.positions.slice(), 3),
    );
    geometry.setIndex(new three.BufferAttribute(mesh.indices.slice(), 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box) {
      return;
    }
    const bounds = this.sourceBounds()!;
    const centre = new three.Vector3(
      ...bounds.min.map((value, axis) => (value + bounds.max[axis]) / 2),
    );
    geometry.translate(-centre.x, -centre.y, -centre.z);
    const group = new three.Group();
    group.add(
      new three.Mesh(
        geometry,
        new three.MeshStandardMaterial({
          color: overlay ? '#b94b24' : '#7B8794',
          roughness: 0.58,
          transparent: overlay,
          opacity: overlay ? 0.55 : 1,
        }),
      ),
    );
    if (overlay) {
      const original = this.source()!;
      const originalGeometry = new three.BufferGeometry();
      originalGeometry.setAttribute(
        'position',
        new three.BufferAttribute(original.positions.slice(), 3),
      );
      originalGeometry.setIndex(
        new three.BufferAttribute(original.indices.slice(), 1),
      );
      originalGeometry.computeVertexNormals();
      originalGeometry.translate(-centre.x, -centre.y, -centre.z);
      group.add(
        new three.Mesh(
          originalGeometry,
          new three.MeshStandardMaterial({
            color: '#087c9f',
            transparent: true,
            opacity: 0.55,
          }),
        ),
      );
    }
    this.previewModel.set({
      extent: Math.max(...this.sourceBounds()!.spans, 1),
      object: group,
    });
  }
}
