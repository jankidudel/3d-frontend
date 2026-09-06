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
import {
  metrics,
  readStl,
  simplify,
  StlMesh,
  writeBinaryStl,
} from './stl-reducer';

type Mode = 'encoding' | 'reduction';
interface Result {
  readonly mesh: StlMesh;
  readonly blob: Blob;
  readonly keepPercent: number;
}
interface PreviewModel {
  readonly extent: number;
  readonly object: import('three').Object3D;
}

@Component({
  selector: 'app-stl-reducer-page',
  imports: [RouterLink, ObjectViewerComponent],
  templateUrl: './stl-reducer-page.html',
  styleUrl: './stl-reducer-page.scss',
})
export class StlReducerPage {
  readonly routeUrl = PublicRouteUrl;
  readonly file = signal<File | null>(null);
  readonly source = signal<StlMesh | null>(null);
  readonly result = signal<Result | null>(null);
  readonly mode = signal<Mode>('encoding');
  readonly keepPercent = signal(75);
  readonly error = signal('');
  readonly processing = signal(false);
  readonly preview = signal<'original' | 'reduced'>('original');
  readonly previewModel = signal<PreviewModel | null>(null);
  readonly sourceMetrics = computed(() => {
    const mesh = this.source();
    const file = this.file();
    return mesh && file ? metrics(mesh, file.size) : null;
  });
  readonly resultMetrics = computed(() => {
    const result = this.result();
    return result ? metrics(result.mesh, result.blob.size) : null;
  });
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  constructor() {
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
    this.error.set('');
    this.result.set(null);
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
      this.source.set(await readStl(file));
      this.file.set(file);
      this.preview.set('original');
      await this.showPreview(this.source()!);
      this.analytics.trackReducer(AnalyticsEvent.ReducerFileSelected);
    } catch (error: unknown) {
      this.file.set(null);
      this.source.set(null);
      this.error.set(
        error instanceof Error
          ? error.message
          : 'We could not read that STL file.',
      );
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
    this.keepPercent.set(percent);
    this.analytics.trackReducer(AnalyticsEvent.ReducerPresetSelected);
  }
  setCustom(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (
      !Number.isInteger(value) ||
      value < 1 ||
      value > 99 ||
      !this.source() ||
      value >= this.source()!.indices.length / 3
    ) {
      this.error.set(
        'Enter a whole target triangle count between 1 and one less than the source count.',
      );
      return;
    }
    this.error.set('');
    this.keepPercent.set((value / (this.source()!.indices.length / 3)) * 100);
  }
  async process(): Promise<void> {
    const source = this.source();
    if (!source || this.processing()) {
      return;
    }
    this.error.set('');
    this.processing.set(true);
    try {
      if (this.mode() === 'encoding') {
        if (source.encoding === 'binary STL') {
          return;
        }
        const blob = writeBinaryStl(source);
        this.result.set({ mesh: source, blob, keepPercent: 100 });
        this.analytics.trackReducer(AnalyticsEvent.ReducerLosslessCompleted);
      } else {
        const mesh = await simplify(source, this.keepPercent() / 100);
        const blob = writeBinaryStl(mesh);
        const output = metrics(mesh, blob.size);
        if (
          this.sourceMetrics()?.warnings.length === 0 &&
          output.warnings.length > 0
        ) {
          this.result.set(null);
          this.error.set(
            'This reduction introduced mesh warnings. Try a gentler reduction.',
          );
          return;
        }
        this.result.set({ mesh, blob, keepPercent: this.keepPercent() });
        this.preview.set('reduced');
        await this.showPreview(mesh);
        this.analytics.trackReducer(AnalyticsEvent.ReducerReductionCompleted);
      }
    } finally {
      this.processing.set(false);
    }
  }
  download(): void {
    const result = this.result();
    const file = this.file();
    if (!result || !file) {
      return;
    }
    const suffix =
      this.mode() === 'encoding'
        ? 'optimised'
        : `reduced-${Math.round(result.keepPercent)}`;
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(result.blob);
    anchor.download = `${file.name.replace(/\.stl$/i, '')}-${suffix}.stl`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    if (this.mode() === 'reduction') {
      this.analytics.trackReducer(AnalyticsEvent.ReducerReducedDownloaded);
    }
  }
  reset(): void {
    this.file.set(null);
    this.source.set(null);
    this.result.set(null);
    this.error.set('');
    this.preview.set('original');
    this.previewModel.set(null);
  }
  async showOriginal(): Promise<void> {
    const source = this.source();
    if (!source) {
      return;
    }
    this.preview.set('original');
    await this.showPreview(source);
  }
  async showReduced(): Promise<void> {
    const result = this.result();
    if (!result) {
      return;
    }
    this.preview.set('reduced');
    await this.showPreview(result.mesh);
  }
  formatBytes(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KiB`
      : `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
  }
  formatDimensions(dimensions: readonly number[]): string {
    return dimensions.map((value) => value.toFixed(2)).join(' × ');
  }
  private async showPreview(mesh: StlMesh): Promise<void> {
    const three = await import('three');
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
    const size = box.getSize(new three.Vector3());
    const centre = box.getCenter(new three.Vector3());
    geometry.translate(-centre.x, -centre.y, -centre.z);
    this.previewModel.set({
      extent: Math.max(size.x, size.y, size.z),
      object: new three.Mesh(
        geometry,
        new three.MeshStandardMaterial({ color: '#7B8794', roughness: 0.58 }),
      ),
    });
  }
}
