import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';

interface ViewerRuntime {
  readonly THREE: typeof import('three');
  readonly renderer: import('three').WebGLRenderer;
  readonly scene: import('three').Scene;
  readonly camera: import('three').PerspectiveCamera;
  readonly controls: import('three/examples/jsm/controls/OrbitControls.js').OrbitControls;
  readonly object: import('three').Object3D;
  frame: number;
}

@Component({
  selector: 'app-object-viewer',
  templateUrl: './object-viewer.html',
  styleUrl: './object-viewer.scss',
})
export class ObjectViewerComponent {
  readonly object = input.required<import('three').Object3D>();
  readonly extent = input.required<number>();
  readonly ariaLabel = input.required<string>();
  readonly chooseAnother = output<void>();
  readonly resetView = output<void>();
  readonly rendered = output<void>();
  readonly renderFailed = output<void>();
  readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');
  readonly container = viewChild<ElementRef<HTMLDivElement>>('container');
  readonly modelColor = signal('#2563a8');
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ready = signal(false);
  private runtime: ViewerRuntime | null = null;
  private observer: ResizeObserver | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
    afterNextRender(() => this.ready.set(true));
    effect(() => {
      if (!this.ready() || !this.browser) {
        return;
      }
      void this.render(this.object(), this.extent());
    });
  }

  reset(): void {
    const runtime = this.runtime;
    if (!runtime) {
      return;
    }
    this.frame(runtime);
    this.resetView.emit();
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
    this.applyModelColor(this.object(), color);
  }

  async toggleFullscreen(): Promise<void> {
    const container = this.container()?.nativeElement;
    if (!container) {
      return;
    }
    if (this.document.fullscreenElement === container) {
      await this.document.exitFullscreen();
      return;
    }
    await container.requestFullscreen();
  }

  private async render(
    object: import('three').Object3D,
    extent: number,
  ): Promise<void> {
    this.dispose();
    const host = this.viewport()?.nativeElement;
    if (!host) {
      this.disposeObject(object);
      return;
    }
    try {
      const [THREE, controlsModule] = await Promise.all([
        import('three'),
        import('three/examples/jsm/controls/OrbitControls.js'),
      ]);
      if (this.object() !== object) {
        this.disposeObject(object);
        return;
      }
      const renderer = new THREE.WebGLRenderer({ antialias: true });
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#e6edf5');
      const camera = new THREE.PerspectiveCamera(
        45,
        1,
        Math.max(extent / 1000, 0.001),
        Math.max(extent * 1000, 100),
      );
      scene.add(new THREE.HemisphereLight('#ffffff', '#9aa8b8', 2.4));
      const light = new THREE.DirectionalLight('#ffffff', 2.2);
      light.position.set(1, 2, 3);
      scene.add(light, object);
      host.replaceChildren(renderer.domElement);
      const controls = new controlsModule.OrbitControls(
        camera,
        renderer.domElement,
      );
      controls.enableDamping = true;
      controls.minDistance = Math.max(extent * 0.05, 0.01);
      controls.maxDistance = Math.max(extent * 20, 100);
      this.applyModelColor(object, this.modelColor());
      const runtime: ViewerRuntime = {
        THREE,
        renderer,
        scene,
        camera,
        controls,
        object,
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
      this.rendered.emit();
      this.scrollIntoView(runtime);
    } catch {
      this.disposeObject(object);
      this.renderFailed.emit();
    }
  }

  private applyModelColor(
    object: import('three').Object3D,
    color: string,
  ): void {
    object.traverse((child) => {
      const mesh = child as import('three').Mesh;
      if (!mesh.isMesh) {
        return;
      }
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of materials) {
        if ('color' in material) {
          (material as import('three').MeshStandardMaterial).color.set(color);
        }
      }
    });
  }

  private frame(runtime: ViewerRuntime): void {
    const box = new runtime.THREE.Box3().setFromObject(runtime.object);
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

  private scrollIntoView(runtime: ViewerRuntime): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.runtime !== runtime) {
          return;
        }
        this.viewport()?.nativeElement.scrollIntoView({
          behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'center',
        });
      });
    });
  }

  private prefersReducedMotion(): boolean {
    return (
      this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)')
        .matches ?? false
    );
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
    this.disposeObject(runtime.object);
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
}
