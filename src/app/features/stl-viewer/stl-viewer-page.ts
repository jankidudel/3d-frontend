import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
interface ModelInfo {
  readonly name: string;
  readonly size: number;
  readonly triangles: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}
interface ViewerRuntime {
  readonly THREE: typeof import('three');
  readonly renderer: import('three').WebGLRenderer;
  readonly scene: import('three').Scene;
  readonly camera: import('three').PerspectiveCamera;
  readonly controls: import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;
  geometry: import('three').BufferGeometry | null;
  material: import('three').Material | null;
  frame: number;
}

@Component({
  selector: 'app-stl-viewer-page',
  imports: [RouterLink],
  templateUrl: './stl-viewer-page.html',
  styleUrl: '../shared/model-viewer-page.scss',
})
export class StlViewerPage {
  readonly routeUrl = PublicRouteUrl;
  readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');
  readonly picker = viewChild<ElementRef<HTMLInputElement>>('picker');
  readonly error = signal('');
  readonly model = signal<ModelInfo | null>(null);
  readonly loading = signal(false);
  readonly webglUnavailable = signal(false);
  readonly modelColor = signal('#2563a8');
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);
  private runtime: ViewerRuntime | null = null;
  private observer: ResizeObserver | null = null;

  constructor() {
    this.seo.apply({
      title:
        'Free STL Viewer Online - Open and Inspect STL Files | InspectMesh',
      description:
        'Open and inspect STL files online in your browser. Rotate, zoom and pan your 3D model, then view its dimensions, triangle count and file size.',
      path: PublicRouteUrl.Viewer,
    });
    this.destroyRef.onDestroy(() => this.dispose());
  }

  openPicker(): void {
    this.picker()?.nativeElement.click();
  }
  onPicker(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.item(0) ?? null;
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
  reset(): void {
    const runtime = this.runtime;
    if (!runtime || !runtime.geometry) {
      return;
    }
    this.frame(runtime);
    this.analytics.trackStlViewerReset();
  }

  zoom(scale: number): void {
    const runtime = this.runtime;
    if (!runtime) {
      return;
    }
    const offset = runtime.camera.position
      .clone()
      .sub(runtime.controls.target)
      .multiplyScalar(scale);
    runtime.camera.position.copy(runtime.controls.target).add(offset);
    runtime.controls.update();
  }

  onColorChange(event: Event): void {
    const color = (event.target as HTMLInputElement).value;
    this.modelColor.set(color);
    const material = this.runtime?.material;
    if (material && 'color' in material) {
      (material as import('three').MeshStandardMaterial).color.set(color);
    }
  }

  async toggleFullscreen(container: HTMLElement): Promise<void> {
    if (document.fullscreenElement === container) {
      await document.exitFullscreen();
      return;
    }
    await container.requestFullscreen();
  }

  openQualityChecker(): void {
    this.analytics.trackStlViewerQualityOpened();
  }

  private async load(file: File): Promise<void> {
    this.error.set('');
    if (!file.name.toLowerCase().endsWith('.stl')) {
      this.fail('Choose an STL file with a .stl extension.', 'wrong_extension');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      this.fail(
        'This file is over the 25 MB limit. Choose a smaller STL file.',
        'too_large',
      );
      return;
    }
    this.analytics.trackStlViewerFileSelected(file.size);
    this.loading.set(true);
    try {
      const [{ STLLoader }, three, controlsModule] = await Promise.all([
        import('three/examples/jsm/loaders/STLLoader.js'),
        import('three'),
        import('three/examples/jsm/controls/OrbitControls.js'),
      ]);
      const geometry = new STLLoader().parse(await file.arrayBuffer());
      if (
        !geometry.getAttribute('position') ||
        geometry.getAttribute('position').count === 0
      ) {
        throw new Error('empty');
      }
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      if (!box) {
        throw new Error('bounds');
      }
      const size = box.getSize(new three.Vector3());
      this.model.set({
        name: file.name,
        size: file.size,
        triangles: geometry.getAttribute('position').count / 3,
        width: size.x,
        height: size.y,
        depth: size.z,
      });
      await this.waitForViewport();
      const centre = box.getCenter(new three.Vector3());
      geometry.translate(-centre.x, -centre.y, -centre.z);
      await this.render(
        three,
        controlsModule.OrbitControls,
        geometry,
        Math.max(size.x, size.y, size.z),
      );
      this.analytics.trackStlViewerLoaded(file.size);
    } catch {
      this.model.set(null);
      this.fail(
        this.webglUnavailable()
          ? 'WebGL is unavailable in this browser. You can still use the other tools.'
          : 'We could not read that STL file. Choose a valid ASCII or binary STL file.',
        this.webglUnavailable() ? 'webgl_unavailable' : 'parse_failed',
      );
    } finally {
      this.loading.set(false);
    }
  }

  private waitForViewport(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  private async render(
    THREE: typeof import('three'),
    OrbitControls: typeof import('three/examples/jsm/controls/OrbitControls.js').OrbitControls,
    geometry: import('three').BufferGeometry,
    extent: number,
  ): Promise<void> {
    this.dispose();
    const host = this.viewport()?.nativeElement;
    if (!host) {
      return;
    }
    let renderer: import('three').WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      this.webglUnavailable.set(true);
      geometry.dispose();
      throw new Error('webgl');
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e6edf5');
    const camera = new THREE.PerspectiveCamera(
      45,
      1,
      Math.max(extent / 1000, 0.001),
      Math.max(extent * 1000, 100),
    );
    const material = new THREE.MeshStandardMaterial({
      color: this.modelColor(),
      roughness: 0.58,
      metalness: 0.05,
    });
    scene.add(new THREE.HemisphereLight('#ffffff', '#9aa8b8', 2.4));
    const light = new THREE.DirectionalLight('#ffffff', 2.2);
    light.position.set(1, 2, 3);
    scene.add(light, new THREE.Mesh(geometry, material));
    host.replaceChildren(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = Math.max(extent * 0.05, 0.01);
    controls.maxDistance = Math.max(extent * 20, 100);
    const runtime: ViewerRuntime = {
      THREE,
      renderer,
      scene,
      camera,
      controls,
      geometry,
      material,
      frame: 0,
    };
    this.runtime = runtime;
    this.frame(runtime);
    this.observer = new ResizeObserver(() => this.resize(runtime));
    this.observer.observe(host);
    this.resize(runtime);
    const animate = (): void => {
      if (this.runtime !== runtime) {
        return;
      }
      controls.update();
      renderer.render(scene, camera);
      runtime.frame = requestAnimationFrame(animate);
    };
    runtime.frame = requestAnimationFrame(animate);
  }
  private frame(runtime: ViewerRuntime): void {
    const box = runtime.geometry?.boundingBox;
    if (!box) {
      return;
    }
    const size = box.getSize(new runtime.THREE.Vector3());
    const distance = Math.max(size.x, size.y, size.z) * 1.8 || 10;
    runtime.camera.position.set(distance, distance * 0.7, distance);
    runtime.controls.target.set(0, 0, 0);
    runtime.controls.update();
    this.resize(runtime);
  }
  private resize(runtime: ViewerRuntime): void {
    const host = this.viewport()?.nativeElement;
    if (!host) {
      return;
    }
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    runtime.renderer.setSize(width, height, false);
    runtime.camera.aspect = width / height;
    runtime.camera.updateProjectionMatrix();
  }
  private fail(
    message: string,
    kind:
      'too_large' | 'wrong_extension' | 'parse_failed' | 'webgl_unavailable',
  ): void {
    this.error.set(message);
    this.analytics.trackStlViewerFailed(kind);
  }
  private dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
    const runtime = this.runtime;
    if (!runtime) {
      return;
    }
    cancelAnimationFrame(runtime.frame);
    runtime.controls.dispose();
    runtime.geometry?.dispose();
    runtime.material?.dispose();
    runtime.renderer.dispose();
    runtime.renderer.domElement.remove();
    this.runtime = null;
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
