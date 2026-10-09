import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { ReviewSession, ReviewDestination } from './review-session';
import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
  BufferGeometry,
  BufferAttribute,
  DoubleSide,
} from 'three';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-analysis';
import { meshDimensions } from '../stl-print-preflight/stl-print-preflight-analysis';
import { exampleFile, MeshExample } from './example-meshes';
import { loadWorkflowModel } from './load-model';
import {
  bufferGeometry,
  ModelUnits,
  SurfaceDifference,
  WorkflowLimits,
  meshSurfaceArea,
  GeometryCheck,
} from './mesh-workflows';
import { MeshWorkerMode, runMeshWorker } from './mesh-worker';
const Alignment = { Original: 'original', Centres: 'centres' } as const;
type Alignment = (typeof Alignment)[keyof typeof Alignment];
const RevisionSide = { Before: 'before', After: 'after' } as const;
type RevisionSide = (typeof RevisionSide)[keyof typeof RevisionSide];
interface Revision {
  readonly file: File;
  readonly mesh: IndexedTriangleGeometry;
  readonly dimensions: ReturnType<typeof meshDimensions>;
  readonly area: number;
}
@Component({
  selector: 'app-compare-page',
  imports: [RouterLink, DecimalPipe, ObjectViewerComponent],
  templateUrl: './compare-page.html',
  styleUrl: '../planning/planning-page.scss',
})
export class ComparePage {
  readonly guideRouteUrl = GuideRouteUrl;
  readonly handoff = signal(
    inject(ReviewSession).take(ReviewDestination.Compare),
  );
  readonly fromCollection = this.handoff() !== null;
  readonly routeUrl = PublicRouteUrl;
  readonly sides = RevisionSide;
  readonly alignments = Alignment;
  readonly units = ModelUnits;
  readonly before = signal<Revision | null>(null);
  readonly after = signal<Revision | null>(null);
  readonly beforeUnit = signal<ModelUnits>(ModelUnits.Millimetres);
  readonly afterUnit = signal<ModelUnits>(ModelUnits.Millimetres);
  readonly alignment = signal<Alignment>(Alignment.Original);
  readonly opacity = signal(0.45);
  readonly tolerance = signal(0.1);
  readonly volumeChecks = signal<readonly GeometryCheck[]>([]);
  readonly difference = signal<SurfaceDifference | null>(null);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly byteEquality = signal<boolean | null>(null);
  readonly object = signal<Group | null>(null);
  readonly extent = signal(20);
  readonly offset = computed(() => {
    const before = this.before();
    const after = this.after();
    if (!before || !after || this.alignment() === Alignment.Original) {
      return [0, 0, 0];
    }
    const bounds = (mesh: IndexedTriangleGeometry) => {
      const minimum = [Infinity, Infinity, Infinity];
      const maximum = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < mesh.positions.length; i++) {
        const axis = i % 3;
        minimum[axis] = Math.min(minimum[axis], mesh.positions[i]);
        maximum[axis] = Math.max(maximum[axis], mesh.positions[i]);
      }
      return minimum.map((value, axis) => (value + maximum[axis]) / 2);
    };
    const centre = bounds;
    const a = centre(before.mesh);
    const b = centre(after.mesh);
    return a.map((value, axis) => value - b[axis]);
  });
  private readonly analytics = inject(AnalyticsService);
  private controller: AbortController | null = null;
  private readonly loads: Record<RevisionSide, number> = {
    [RevisionSide.Before]: 0,
    [RevisionSide.After]: 0,
  };
  async openHandoff(): Promise<void> {
    const item = this.handoff();
    if (!item) {
      return;
    }
    this.handoff.set(null);
    this.beforeUnit.set(item.unit);
    await this.load(RevisionSide.Before, item.file);
  }
  constructor() {
    inject(SeoService).apply({
      title:
        'Compare STL Files - Revision Overlay and Surface Samples | InspectMesh',
      description:
        'Compare two STL revisions locally in a shared coordinate frame. Review dimensions, surface area and bidirectional sampled geometric differences with explicit tolerance.',
      path: PublicRouteUrl.StlCompare,
    });
    inject(DestroyRef).onDestroy(() => {
      this.controller?.abort();
      this.disposeObject();
    });
  }
  async pick(side: RevisionSide, event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      await this.load(side, file);
    }
  }
  async load(side: RevisionSide, file: File): Promise<void> {
    const generation = ++this.loads[side];
    (side === RevisionSide.Before ? this.before : this.after).set(null);
    this.redraw();
    this.error.set('');
    this.controller?.abort();
    this.volumeChecks.set([]);
    this.difference.set(null);
    this.byteEquality.set(null);
    try {
      if (!/\.stl$/i.test(file.name)) {
        throw new Error(
          'Revision comparison currently accepts STL files only.',
        );
      }
      const loaded = await loadWorkflowModel(
        file,
        side === RevisionSide.Before ? this.beforeUnit() : this.afterUnit(),
      );
      if (generation !== this.loads[side]) {
        return;
      }
      const mesh = {
        positions: loaded.mesh.positions.map((value) => value * loaded.scale),
        indices: loaded.mesh.indices,
      };
      const revision = {
        file,
        mesh,
        dimensions: meshDimensions(mesh),
        area: meshSurfaceArea(mesh),
      };
      (side === RevisionSide.Before ? this.before : this.after).set(revision);
      this.redraw();
    } catch (error: unknown) {
      if (generation !== this.loads[side]) {
        return;
      }
      (side === RevisionSide.Before ? this.before : this.after).set(null);
      this.redraw();
      this.error.set(
        error instanceof Error ? error.message : 'STL could not be read.',
      );
    }
  }
  async example(retriangulated = false): Promise<void> {
    this.beforeUnit.set(ModelUnits.Millimetres);
    this.afterUnit.set(ModelUnits.Millimetres);
    this.alignment.set(Alignment.Original);
    await this.load(RevisionSide.Before, exampleFile(MeshExample.Cube));
    await this.load(
      RevisionSide.After,
      exampleFile(
        retriangulated ? MeshExample.Retriangulated : MeshExample.Changed,
      ),
    );
    this.analytics.trackWorkflow(AnalyticsEvent.ExampleLoaded, 'stl_compare');
    await this.compare();
  }
  alignedAfter(): IndexedTriangleGeometry | null {
    const mesh = this.after()?.mesh;
    const offset = this.offset();
    return mesh
      ? {
          ...mesh,
          positions: mesh.positions.map((value, i) => value + offset[i % 3]),
        }
      : null;
  }
  changeAlignment(event: Event): void {
    this.alignment.set((event.target as HTMLSelectElement).value as Alignment);
    this.difference.set(null);
    this.redraw();
  }
  changeOpacity(event: Event): void {
    this.opacity.set(Number((event.target as HTMLInputElement).value));
    this.redraw();
  }
  async changeUnit(side: RevisionSide, event: Event): Promise<void> {
    const value = (event.target as HTMLSelectElement).value as ModelUnits;
    (side === RevisionSide.Before ? this.beforeUnit : this.afterUnit).set(
      value,
    );
    const revision = (
      side === RevisionSide.Before ? this.before : this.after
    )();
    if (revision) {
      await this.load(side, revision.file);
    }
  }
  async compare(): Promise<void> {
    const before = this.before();
    const after = this.after();
    const aligned = this.alignedAfter();
    if (!before || !after || !aligned || this.busy()) {
      return;
    }
    if (!(Number.isFinite(this.tolerance()) && this.tolerance() >= 0)) {
      this.error.set('Enter a finite nonnegative tolerance in millimetres.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    this.difference.set(null);
    this.controller = new AbortController();
    this.analytics.trackWorkflow(AnalyticsEvent.ToolStarted, 'stl_compare');
    try {
      const [a, b] = await Promise.all([
        before.file.arrayBuffer(),
        after.file.arrayBuffer(),
      ]);
      const first = new Uint8Array(a);
      const second = new Uint8Array(b);
      this.byteEquality.set(
        first.length === second.length &&
          first.every((value, index) => value === second[index]),
      );
      const settings = {
        stlUnit: ModelUnits.Millimetres,
        printer: null,
        thicknessThresholdMm: 1.2,
      };
      const [result, firstCheck, secondCheck] = await Promise.all([
        runMeshWorker(
          {
            mode: MeshWorkerMode.Compare,
            before: before.mesh,
            after: aligned,
            tolerance: this.tolerance(),
          },
          this.controller.signal,
        ),
        runMeshWorker(
          { mode: MeshWorkerMode.Check, mesh: before.mesh, settings, scale: 1 },
          this.controller.signal,
        ),
        runMeshWorker(
          { mode: MeshWorkerMode.Check, mesh: aligned, settings, scale: 1 },
          this.controller.signal,
        ),
      ]);
      this.volumeChecks.set([firstCheck.check!, secondCheck.check!]);
      this.difference.set(result.difference ?? null);
      this.redraw();
      this.analytics.trackWorkflow(AnalyticsEvent.ToolCompleted, 'stl_compare');
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Comparison could not complete.',
      );
    } finally {
      this.busy.set(false);
    }
  }
  cancel(): void {
    this.controller?.abort();
  }
  redraw(): void {
    this.disposeObject();
    const group = new Group();
    const items = [this.before()?.mesh, this.alignedAfter()];
    items.forEach((mesh, index) => {
      if (mesh) {
        const geometry = bufferGeometry(mesh);
        const colors = new Float32Array(mesh.positions.length);
        for (let i = 0; i < colors.length; i += 3) {
          colors.set(index === 0 ? [0.05, 0.65, 0.8] : [0.85, 0.25, 0.1], i);
        }
        geometry.setAttribute('color', new BufferAttribute(colors, 3));
        group.add(
          new Mesh(
            geometry,
            new MeshBasicMaterial({
              vertexColors: true,
              transparent: true,
              opacity: this.opacity(),
              side: DoubleSide,
              depthWrite: false,
            }),
          ),
        );
      }
    });
    const difference = this.difference();
    if (difference) {
      const changed = [...difference.forward, ...difference.reverse].filter(
        (sample) => sample.distance > difference.toleranceMm,
      );
      if (changed.length) {
        const geometry = new BufferGeometry();
        geometry.setAttribute(
          'position',
          new BufferAttribute(
            new Float32Array(changed.flatMap((sample) => sample.point)),
            3,
          ),
        );
        group.add(
          new Points(
            geometry,
            new PointsMaterial({
              color: '#941647',
              size: 1.5,
              sizeAttenuation: false,
            }),
          ),
        );
      }
    }
    if (group.children.length) {
      const minimum = [Infinity, Infinity, Infinity];
      const maximum = [-Infinity, -Infinity, -Infinity];
      for (const item of items) {
        if (item) {
          for (let i = 0; i < item.positions.length; i++) {
            const axis = i % 3;
            minimum[axis] = Math.min(minimum[axis], item.positions[i]);
            maximum[axis] = Math.max(maximum[axis], item.positions[i]);
          }
        }
      }
      this.extent.set(
        Math.max(...minimum.map((value, axis) => maximum[axis] - value), 1),
      );
      this.object.set(group);
    }
  }
  private disposeObject(): void {
    this.object()?.traverse((object) => {
      if (object instanceof Mesh || object instanceof Points) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.object.set(null);
  }
  export(): void {
    const result = this.difference();
    if (!result) {
      return;
    }
    const contents = JSON.stringify(
      {
        schema: 'inspectmesh-stl-compare-1',
        alignment: this.alignment(),
        afterTranslationMm: this.offset(),
        unitAssumptions: { before: this.beforeUnit(), after: this.afterUnit() },
        identicalBytes: this.byteEquality(),
        before: this.before()?.dimensions,
        screenedVolumesMm3: this.volumeChecks().map(
          (check) => check.topology.volume,
        ),
        after: this.after()?.dimensions,
        method: result.method,
        samplesPerDirection: WorkflowLimits.CompareSamples,
        toleranceMm: result.toleranceMm,
        maximumSampledMm: result.maximumSampledMm,
        meanSampledMm: result.meanSampledMm,
        samplesOverTolerance: result.samplesOverTolerance,
        limitations:
          'Sampled surface distances are not a proof of equality, certified metrology or a maximum bound over the whole surface.',
      },
      null,
      2,
    );
    const url = URL.createObjectURL(
      new Blob([contents], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'inspectmesh-revision-report.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.analytics.trackWorkflow(
      AnalyticsEvent.ReportExported,
      'stl_compare',
      'json',
    );
  }
}
