import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
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
}

interface ViewerRuntime {
  readonly THREE: typeof import('three');
  readonly renderer: import('three').WebGLRenderer;
  readonly scene: import('three').Scene;
  readonly camera: import('three').PerspectiveCamera;
  readonly controls: import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;
  readonly model: import('three').Group;
  frame: number;
}

@Component({
  selector: 'app-three-mf-viewer-page',
  imports: [RouterLink],
  templateUrl: './threemf-viewer-page.html',
  styleUrl: './threemf-viewer-page.scss',
})
export class ThreeMfViewerPage {
  readonly routeUrl = PublicRouteUrl;
  readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');
  readonly picker = viewChild<ElementRef<HTMLInputElement>>('picker');
  readonly error = signal('');
  readonly model = signal<ModelInfo | null>(null);
  readonly loading = signal(false);
  readonly webglUnavailable = signal(false);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private runtime: ViewerRuntime | null = null;
  private observer: ResizeObserver | null = null;

  constructor() {
    this.seo.apply({
      title:
        'Free 3MF Viewer Online - Open and Inspect 3MF Files | InspectMesh',
      description:
        'Open a 3MF file locally in your browser. Rotate, zoom and inspect its build geometry, declared units, dimensions and triangle count.',
      path: PublicRouteUrl.ThreeMfViewer,
    });
    this.destroyRef.onDestroy(() => this.dispose());
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

  reset(): void {
    const runtime = this.runtime;
    if (!runtime) {
      return;
    }
    this.frame(runtime);
  }

  private async load(file: File): Promise<void> {
    this.error.set('');
    this.model.set(null);
    this.dispose();
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
      const [{ ThreeMFLoader }, three, controlsModule] = await Promise.all([
        import('three/examples/jsm/loaders/3MFLoader.js'),
        import('three'),
        import('three/examples/jsm/controls/OrbitControls.js'),
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
      });
      await this.waitForViewport();
      await this.render(
        three,
        controlsModule.OrbitControls,
        group,
        Math.max(size.x, size.y, size.z),
      );
    } catch {
      this.model.set(null);
      this.dispose();
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

  private waitForViewport(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  private async render(
    THREE: typeof import('three'),
    OrbitControls: typeof import('three/examples/jsm/controls/OrbitControls.js').OrbitControls,
    model: import('three').Group,
    extent: number,
  ): Promise<void> {
    const host = this.viewport()?.nativeElement;
    if (!host) {
      this.disposeObject(model);
      return;
    }
    let renderer: import('three').WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      this.webglUnavailable.set(true);
      this.disposeObject(model);
      throw new Error('webgl');
    }
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f7f8fa');
    const camera = new THREE.PerspectiveCamera(
      45,
      1,
      Math.max(extent / 1000, 0.001),
      Math.max(extent * 1000, 100),
    );
    scene.add(new THREE.HemisphereLight('#ffffff', '#9aa8b8', 2.4));
    const light = new THREE.DirectionalLight('#ffffff', 2.2);
    light.position.set(1, 2, 3);
    scene.add(light, model);
    host.replaceChildren(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const runtime: ViewerRuntime = {
      THREE,
      renderer,
      scene,
      camera,
      controls,
      model,
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
    const box = new runtime.THREE.Box3().setFromObject(runtime.model);
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

  private dispose(): void {
    this.observer?.disconnect();
    this.observer = null;
    const runtime = this.runtime;
    if (!runtime) {
      return;
    }
    cancelAnimationFrame(runtime.frame);
    runtime.controls.dispose();
    this.disposeObject(runtime.model);
    runtime.renderer.dispose();
    runtime.renderer.domElement.remove();
    this.runtime = null;
  }

  private disposeObject(object: import('three').Object3D): void {
    object.traverse((child) => {
      const mesh = child as import('three').Mesh;
      if (!mesh.isMesh) {
        return;
      }
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value && typeof value === 'object' && 'isTexture' in value) {
            (value as import('three').Texture).dispose();
          }
        }
        material.dispose();
      }
    });
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
