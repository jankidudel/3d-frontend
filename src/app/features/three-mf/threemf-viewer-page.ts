import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { unzipSync } from 'fflate';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';

const MAX_FILE_SIZE = 25 * 1024 * 1024;

interface ModelInfo {
  readonly name: string;
  readonly size: number;
  readonly unit: string;
  readonly triangles: number;
  readonly buildItems: number | null;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly object: import('three').Object3D;
  readonly extent: number;
}

@Component({
  selector: 'app-three-mf-viewer-page',
  imports: [ObjectViewerComponent, RouterLink],
  templateUrl: './threemf-viewer-page.html',
  styleUrl: './threemf-viewer-page.scss',
})
export class ThreeMfViewerPage {
  readonly routeUrl = PublicRouteUrl;
  readonly picker = viewChild<ElementRef<HTMLInputElement>>('picker');
  readonly error = signal('');
  readonly model = signal<ModelInfo | null>(null);
  readonly loading = signal(false);
  readonly webglUnavailable = signal(false);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title:
        'Free 3MF Viewer Online - Open and Inspect 3MF Files | InspectMesh',
      description:
        'Open a 3MF file locally in your browser. Rotate, zoom and inspect its build geometry, declared units, dimensions and triangle count.',
      path: PublicRouteUrl.ThreeMfViewer,
    });
  }

  openPicker(): void {
    this.picker()?.nativeElement.click();
  }

  onPicker(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0) ?? null;
    input.value = '';
    if (file) {
      void this.load(file);
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files.item(0) ?? null;
    if (file) {
      void this.load(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private async load(file: File): Promise<void> {
    this.error.set('');
    this.model.set(null);
    if (!this.browser) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.3mf')) {
      this.error.set('Choose a 3MF file with a .3mf extension.');
      return;
    }
    if (file.size === 0) {
      this.error.set('The selected 3MF file is empty. Choose another file.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      this.error.set(
        'This file is over the 25 MB limit. Choose a smaller 3MF file.',
      );
      return;
    }

    this.loading.set(true);
    try {
      const [{ ThreeMFLoader }, three] = await Promise.all([
        import('three/examples/jsm/loaders/3MFLoader.js'),
        import('three'),
      ]);
      const data = await file.arrayBuffer();
      const group = new ThreeMFLoader().parse(data);
      group.updateMatrixWorld(true);
      const bounds = new three.Box3().setFromObject(group);
      if (bounds.isEmpty()) {
        throw new Error('empty');
      }
      const size = bounds.getSize(new three.Vector3());
      const triangles = this.triangleCount(group);
      if (triangles === 0) {
        throw new Error('empty');
      }
      const centre = bounds.getCenter(new three.Vector3());
      group.position.sub(centre);
      group.updateMatrixWorld(true);
      this.model.set({
        name: file.name,
        size: file.size,
        unit: this.declaredUnit(data),
        triangles,
        buildItems: group.children.length > 0 ? group.children.length : null,
        width: size.x,
        height: size.y,
        depth: size.z,
        object: group,
        extent: Math.max(size.x, size.y, size.z),
      });
    } catch {
      this.model.set(null);
      this.error.set(
        this.webglUnavailable()
          ? 'WebGL is unavailable in this browser. You can still use the other tools.'
          : 'We could not open that 3MF file. Choose a standard, unencrypted 3MF file and try again.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  private declaredUnit(data: ArrayBuffer): string {
    try {
      const files = unzipSync(new Uint8Array(data));
      const modelFile = Object.keys(files).find((path) =>
        /^3D\/[^/]*\.model$/i.test(path),
      );
      if (!modelFile) {
        return 'Not declared';
      }
      const xml = new TextDecoder().decode(files[modelFile]);
      return (
        /<model\b[^>]*\bunit\s*=\s*["']([^"']+)["']/i.exec(xml)?.[1] ??
        'Not declared'
      );
    } catch {
      return 'Not declared';
    }
  }

  private triangleCount(group: import('three').Object3D): number {
    let count = 0;
    group.traverse((object) => {
      const mesh = object as import('three').Mesh;
      if (!mesh.isMesh) {
        return;
      }
      const geometry = mesh.geometry;
      const positions = geometry.getAttribute('position');
      if (!positions) {
        return;
      }
      count += (geometry.index?.count ?? positions.count) / 3;
    });
    return count;
  }

  onRenderFailed(): void {
    this.webglUnavailable.set(true);
    this.model.set(null);
    this.error.set(
      'WebGL is unavailable in this browser. You can still use the other tools.',
    );
  }

  formatBytes(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  formatValue(value: number): string {
    return new Intl.NumberFormat('en', { maximumFractionDigits: 3 }).format(
      value,
    );
  }
}
