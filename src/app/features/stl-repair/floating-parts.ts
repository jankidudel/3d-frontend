import { DOCUMENT, DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
} from 'three';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import {
  PartLimits,
  closeLargestAreas,
  rankedParts,
  type MeshPart,
  type PartAnalysis,
} from './disconnected-parts';
import { PartsAction, type PartsResponse } from './parts-worker';

const PART_COLOUR = {
  Kept: '#708191',
  Removed: '#bb3e32',
  Inspected: '#1767b1',
} as const;
const SECTION_ID = 'remove-floating-parts';
@Component({
  selector: 'app-floating-parts',
  imports: [DecimalPipe, ObjectViewerComponent],
  templateUrl: './floating-parts.html',
  styleUrl: './floating-parts.scss',
})
export class FloatingParts {
  readonly file = input<File | null>(null);
  readonly autoReview = input(false);
  readonly inspectRetained = output<File>();
  readonly analysis = signal<PartAnalysis | null>(null);
  readonly busy = signal(false);
  readonly exporting = signal(false);
  readonly progress = signal(0);
  readonly error = signal('');
  readonly open = signal(false);
  readonly removed = signal<ReadonlySet<number>>(new Set());
  readonly confirmLargest = signal(false);
  readonly largestAreasClose = computed(() =>
    this.analysis() ? closeLargestAreas(this.analysis()!) : false,
  );
  readonly cleanedPreview = signal(false);
  readonly highlighted = signal<number | null>(null);
  readonly page = signal(0);
  readonly inspected = signal<number | null>(null);
  readonly isolated = signal<number | null>(null);
  readonly thumbnails = signal<readonly string[]>([]);
  readonly inspectedPart = computed(() => {
    const id = this.inspected();
    return id === null ? null : (this.analysis()?.parts[id] ?? null);
  });
  readonly orderedParts = computed(() =>
    this.analysis() ? rankedParts(this.analysis()!) : [],
  );
  readonly selectedRank = computed(() =>
    this.orderedParts().findIndex((part) => part.id === this.inspected()),
  );
  readonly object = signal<Group | null>(null);
  readonly downloaded = signal<Blob | null>(null);
  readonly downloadedPartId = signal<number | null>(null);
  readonly viewerError = signal(false);
  readonly viewer = viewChild(ObjectViewerComponent);
  readonly pageSize = PartLimits.PageSize;
  readonly visibleParts = computed(
    () =>
      this.orderedParts().slice(
        this.page() * this.pageSize,
        (this.page() + 1) * this.pageSize,
      ) ?? [],
  );
  readonly pageCount = computed(() =>
    Math.ceil((this.analysis()?.parts.length ?? 0) / this.pageSize),
  );
  readonly totalArea = computed(
    () => this.analysis()?.parts.reduce((sum, part) => sum + part.area, 0) ?? 0,
  );
  readonly largestAreaPercent = computed(() =>
    this.totalArea() > 0
      ? ((this.orderedParts()[0]?.area ?? 0) / this.totalArea()) * 100
      : 0,
  );
  readonly removedTriangles = computed(
    () =>
      this.analysis()?.parts.reduce(
        (sum, part) => sum + (this.removed().has(part.id) ? part.triangles : 0),
        0,
      ) ?? 0,
  );
  readonly keptTriangles = computed(
    () => (this.analysis()?.triangles ?? 0) - this.removedTriangles(),
  );
  readonly frameExtent = computed(
    () => Math.max(...(this.analysis()?.bounds.spans ?? [1])) * 0.65,
  );
  readonly extent = computed(() =>
    Math.max(1, Math.hypot(...(this.analysis()?.bounds.spans ?? [1]))),
  );
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy = inject(DestroyRef);
  private worker: Worker | null = null;
  private generation = 0;
  private previewPositions: Float32Array | null = null;
  private retainedMesh: Mesh<BufferGeometry, MeshStandardMaterial> | null =
    null;
  private removedMesh: Mesh<BufferGeometry, MeshStandardMaterial> | null = null;
  private anchorRequested = false;
  private indexedSelection: ReadonlySet<number> | null = null;
  private colourHighlight: number | null = null;
  private indexedIsolation: number | null = null;
  private partFaces = new Uint32Array(0);
  private partStarts = new Uint32Array(0);
  private selectionVersion = 0;
  private exportVersion = 0;

  constructor() {
    effect(() => this.start(this.file()));
    effect(() => {
      this.removed();
      this.highlighted();
      this.cleanedPreview();
      this.object();
      this.inspected();
      this.isolated();
      this.updatePreview();
    });
    const fragment = this.route.fragment.subscribe((value) => {
      this.anchorRequested = value === SECTION_ID;
      if (this.anchorRequested) {
        this.review();
      }
    });
    afterNextRender(() => {
      if (this.document.location?.hash === '#' + SECTION_ID) {
        this.anchorRequested = true;
        this.review();
      }
    });
    this.destroy.onDestroy(() => {
      fragment.unsubscribe();
      this.worker?.terminate();
      this.generation++;
      this.releasePreview();
    });
  }
  colour(id: number): string {
    return this.removed().has(id) ? PART_COLOUR.Removed : PART_COLOUR.Kept;
  }
  review(): void {
    if (this.analysis()) {
      this.open.set(true);
      if (this.inspected() === null && this.analysis()!.parts.length > 1) {
        this.inspectPart(this.orderedParts()[0]);
      }
    }
    // Wait for Angular to expose the expanded panel, then focus its heading.
    setTimeout(
      () =>
        this.document
          .getElementById(this.analysis() ? 'parts-panel-title' : SECTION_ID)
          ?.focus(),
      0,
    );
  }
  closeReview(): void {
    this.open.set(false);
    this.showWholeModel();
  }
  toggle(id: number): void {
    if (!this.analysis()?.parts[id] || this.exporting()) {
      return;
    }
    const next = new Set(this.removed());
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.select(next);
  }
  private select(next: Set<number>): void {
    this.removed.set(next);
    this.confirmLargest.set(false);
    this.downloaded.set(null);
    this.selectionVersion++;
  }
  reset(): void {
    this.select(new Set());
  }
  keepLargest(): void {
    const parts = this.orderedParts();
    if (parts.length < 2 || this.exporting()) {
      return;
    }
    if (this.largestAreasClose() && !this.confirmLargest()) {
      this.confirmLargest.set(true);
      return;
    }
    this.select(new Set(parts.slice(1).map((part) => part.id)));
  }
  onTriangle(face: number): void {
    const id = this.analysis()?.faceParts[face];
    if (id !== undefined && this.open()) {
      this.inspectPart(this.analysis()!.parts[id]);
    }
  }
  hoverTriangle(face: number | null): void {
    this.highlighted.set(
      face === null ? null : (this.analysis()?.faceParts[face] ?? null),
    );
  }
  inspectPart(part: MeshPart): void {
    const wasIsolated = this.isolated() !== null;
    this.inspected.set(part.id);
    this.isolated.set(null);
    this.cleanedPreview.set(false);
    const rank = this.orderedParts().findIndex((item) => item.id === part.id);
    this.page.set(Math.floor(rank / this.pageSize));
    this.highlighted.set(part.id);
    if (wasIsolated) {
      this.viewer()?.reset();
    }
  }
  stepPart(offset: number): void {
    const parts = this.orderedParts();
    if (!parts.length) {
      return;
    }
    const current = this.selectedRank();
    const next =
      current < 0
        ? 0
        : Math.min(parts.length - 1, Math.max(0, current + offset));
    this.inspectPart(parts[next]);
  }
  isolateSelected(): void {
    const part = this.inspectedPart();
    if (!part) {
      return;
    }
    this.isolated.set(part.id);
    this.focus(part);
  }
  showSelectedInModel(): void {
    this.isolated.set(null);
    this.viewer()?.reset();
  }
  showWholeModel(): void {
    this.inspected.set(null);
    this.isolated.set(null);
    this.highlighted.set(null);
    this.viewer()?.reset();
  }
  focus(part: MeshPart): void {
    this.highlighted.set(part.id);
    const bounds = this.analysis()!.bounds;
    const centre = bounds.min.map(
      (value, axis) => (value + bounds.max[axis]) / 2,
    );
    this.viewer()?.frameBounds(
      part.bounds.min.map((v, i) => v - centre[i]),
      part.bounds.max.map((v, i) => v - centre[i]),
    );
  }
  cancel(): void {
    this.worker?.terminate();
    this.worker = null;
    this.generation++;
    this.busy.set(false);
    this.exporting.set(false);
    this.analysis.set(null);
    this.inspected.set(null);
    this.isolated.set(null);
    this.thumbnails.set([]);
    this.removed.set(new Set());
    this.confirmLargest.set(false);
    this.downloaded.set(null);
    this.releasePreview();
    this.error.set(
      'Part analysis cancelled. Standard cleanup is still available. Retry analysis or choose another STL.',
    );
  }
  retry(): void {
    this.start(this.file());
  }
  download(): void {
    if (
      !this.worker ||
      !this.removed().size ||
      !this.keptTriangles() ||
      this.exporting()
    ) {
      return;
    }
    this.error.set('');
    this.exportVersion = this.selectionVersion;
    this.downloadedPartId.set(null);
    this.exporting.set(true);
    this.worker.postMessage({
      action: PartsAction.Export,
      removed: [...this.removed()],
    });
  }
  downloadPart(): void {
    const part = this.inspectedPart();
    if (!this.worker || !part || this.exporting()) {
      return;
    }
    this.error.set('');
    this.exportVersion = this.selectionVersion;
    this.downloadedPartId.set(part.id);
    this.exporting.set(true);
    this.worker.postMessage({
      action: PartsAction.Export,
      removed: [],
      keepPartId: part.id,
    });
  }
  inspect(): void {
    const blob = this.downloaded();
    if (blob) {
      this.inspectRetained.emit(
        new File([blob], this.outputName(this.downloadedPartId()), {
          type: 'model/stl',
        }),
      );
    }
  }
  private outputName(partId: number | null = null): string {
    if (partId !== null) {
      return `${this.file()?.name.replace(/\.stl$/i, '') ?? 'model'}-piece-${partId + 1}.stl`;
    }
    return (
      (this.file()?.name.replace(/\.stl$/i, '') ?? 'model') +
      '-selected-pieces.stl'
    );
  }
  private save(blob: Blob, partId: number | null = null): void {
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = this.outputName(partId);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  private start(file: File | null): void {
    this.worker?.terminate();
    this.worker = null;
    const generation = ++this.generation;
    this.releasePreview();
    this.analysis.set(null);
    this.inspected.set(null);
    this.isolated.set(null);
    this.thumbnails.set([]);
    this.removed.set(new Set());
    this.confirmLargest.set(false);
    this.open.set(false);
    this.page.set(0);
    this.highlighted.set(null);
    this.cleanedPreview.set(false);
    this.downloaded.set(null);
    this.downloadedPartId.set(null);
    this.error.set('');
    this.busy.set(false);
    this.exporting.set(false);
    this.viewerError.set(false);
    this.selectionVersion++;
    if (!file) {
      return;
    }
    this.busy.set(true);
    this.progress.set(0);
    try {
      const worker = new Worker(new URL('./parts.worker', import.meta.url), {
        type: 'module',
      });
      this.worker = worker;
      worker.onmessage = ({ data }: MessageEvent<PartsResponse>) => {
        if (generation !== this.generation || worker !== this.worker) {
          return;
        }
        if (data.error) {
          this.error.set(data.error);
          this.busy.set(false);
          this.exporting.set(false);
        } else if (data.analysis && data.positions && data.normals) {
          this.analysis.set(data.analysis);
          this.thumbnails.set(data.thumbnails ?? []);
          this.makePreview(data.positions, data.normals);
          this.busy.set(false);
          if (data.analysis.parts.length > 1) {
            this.inspectPart(rankedParts(data.analysis)[0]);
          }
          if (this.anchorRequested) {
            this.review();
          } else if (this.autoReview()) {
            if (data.analysis.parts.length > 1) {
              this.open.set(true);
            }
            setTimeout(() => {
              const section = this.document.getElementById(
                'floating-parts-review',
              );
              section?.scrollIntoView?.({ block: 'start' });
              this.document
                .getElementById('parts-title')
                ?.focus({ preventScroll: true });
            }, 0);
          }
        } else if (data.blob) {
          this.exporting.set(false);
          if (this.exportVersion === this.selectionVersion) {
            this.downloaded.set(data.blob);
            this.downloadedPartId.set(data.keepPartId ?? null);
            this.save(data.blob, data.keepPartId ?? null);
          }
        } else if (data.progress !== undefined) {
          this.progress.set(data.progress);
        }
      };
      worker.onerror = () => {
        if (generation === this.generation) {
          this.error.set(
            'The component worker could not finish. Retry analysis, choose a smaller file, or use standard cleanup.',
          );
          this.busy.set(false);
          this.exporting.set(false);
          worker.terminate();
          this.worker = null;
        }
      };
      worker.postMessage({ action: PartsAction.Analyse, file });
    } catch {
      this.error.set(
        'Component analysis needs browser worker support. Standard cleanup remains available.',
      );
      this.busy.set(false);
    }
  }
  private makePreview(positions: Float32Array, normals: Float32Array): void {
    this.previewPositions = positions;
    const group = new Group();
    const bounds = this.analysis()!.bounds;
    const centre = bounds.min.map((v, axis) => (v + bounds.max[axis]) / 2);
    const colours = new BufferAttribute(new Float32Array(positions.length), 3);
    const position = new BufferAttribute(positions, 3);
    const normal = new BufferAttribute(normals, 3);
    const make = (removed: boolean) => {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', position);
      geometry.setAttribute('normal', normal);
      geometry.setAttribute('color', colours);
      geometry.setIndex([]);
      const material = new MeshStandardMaterial({
        vertexColors: true,
        side: DoubleSide,
        transparent: removed,
        opacity: removed ? 0.23 : 1,
        depthWrite: !removed,
      });
      const mesh = new Mesh(geometry, material);
      mesh.position.set(-centre[0], -centre[1], -centre[2]);
      group.add(mesh);
      return mesh;
    };
    const analysis = this.analysis()!;
    this.partStarts = new Uint32Array(analysis.parts.length + 1);
    for (const part of analysis.parts) {
      this.partStarts[part.id + 1] = this.partStarts[part.id] + part.triangles;
    }
    this.partFaces = new Uint32Array(analysis.triangles);
    const cursor = this.partStarts.slice();
    const base = new Color(PART_COLOUR.Kept);
    for (let face = 0; face < analysis.triangles; face++) {
      const id = analysis.faceParts[face];
      this.partFaces[cursor[id]++] = face;
      const colour = base;
      for (let corner = 0; corner < 3; corner++) {
        colours.setXYZ(face * 3 + corner, colour.r, colour.g, colour.b);
      }
    }
    this.retainedMesh = make(false);
    this.removedMesh = make(true);
    this.object.set(group);
    this.updatePreview();
  }
  private updatePreview(): void {
    const analysis = this.analysis();
    if (
      !analysis ||
      !this.retainedMesh ||
      !this.removedMesh ||
      !this.previewPositions
    ) {
      return;
    }
    const retained: number[] = [],
      removed: number[] = [],
      retainedFaces: number[] = [],
      removedFaces: number[] = [];
    const colours = this.retainedMesh.geometry.getAttribute(
      'color',
    ) as BufferAttribute;
    const recolour = (id: number | null, colour: Color): void => {
      if (id === null || id >= analysis.parts.length) {
        return;
      }
      for (
        let index = this.partStarts[id];
        index < this.partStarts[id + 1];
        index++
      ) {
        const face = this.partFaces[index];
        for (let corner = 0; corner < 3; corner++) {
          colours.setXYZ(face * 3 + corner, colour.r, colour.g, colour.b);
        }
      }
    };
    const highlight = this.highlighted() ?? this.inspected();
    const selectionChanged = this.indexedSelection !== this.removed();
    if (selectionChanged) {
      for (const part of analysis.parts) {
        recolour(part.id, new Color(this.colour(part.id)));
      }
    }
    if (selectionChanged || this.colourHighlight !== highlight) {
      if (this.colourHighlight !== null) {
        recolour(
          this.colourHighlight,
          new Color(this.colour(this.colourHighlight)),
        );
      }
      recolour(highlight, new Color(PART_COLOUR.Inspected));
      this.colourHighlight = highlight;
      colours.needsUpdate = true;
    }
    this.removedMesh.visible = !this.cleanedPreview();
    if (!selectionChanged && this.indexedIsolation === this.isolated()) {
      return;
    }
    this.indexedSelection = this.removed();
    this.indexedIsolation = this.isolated();
    for (let face = 0; face < analysis.triangles; face++) {
      const id = analysis.faceParts[face];
      if (this.isolated() !== null && id !== this.isolated()) {
        continue;
      }
      const removing = this.removed().has(id);
      for (let corner = 0; corner < 3; corner++) {
        (removing ? removed : retained).push(face * 3 + corner);
      }
      (removing ? removedFaces : retainedFaces).push(face);
    }
    colours.needsUpdate = true;
    this.retainedMesh.geometry.setIndex(retained);
    this.removedMesh.geometry.setIndex(removed);
    this.retainedMesh.userData['sourceFaces'] = new Uint32Array(retainedFaces);
    this.removedMesh.userData['sourceFaces'] = new Uint32Array(removedFaces);
    this.removedMesh.visible = !this.cleanedPreview();
  }
  private releasePreview(): void {
    for (const mesh of [this.retainedMesh, this.removedMesh]) {
      mesh?.geometry.dispose();
      mesh?.material.dispose();
    }
    this.retainedMesh = null;
    this.removedMesh = null;
    this.previewPositions = null;
    this.indexedSelection = null;
    this.colourHighlight = null;
    this.indexedIsolation = null;
    this.partFaces = new Uint32Array(0);
    this.partStarts = new Uint32Array(0);
    this.object.set(null);
  }
}
