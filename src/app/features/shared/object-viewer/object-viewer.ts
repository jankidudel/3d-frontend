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
  readonly issueLines: import('three').Group;
  frame: number;
}

export interface ViewerIssueLine {
  readonly color: string;
  readonly positions: readonly number[];
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
  readonly issueLines = input<readonly ViewerIssueLine[]>([]);
  readonly chooseAnother = output<void>();
  readonly resetView = output<void>();
  readonly rendered = output<void>();
  readonly renderFailed = output<void>();
  readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');
  readonly container = viewChild<ElementRef<HTMLDivElement>>('container');
  readonly modelColor = signal('#7B8794');
  readonly isExpanded = signal(false);
  readonly isFallbackExpanded = signal(false);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ready = signal(false);
  private runtime: ViewerRuntime | null = null;
  private observer: ResizeObserver | null = null;
  private expandedScrollY = 0;
  private previousBodyStyle = '';
  private rotationFrame = 0;
  private rotationAnimating = false;

  constructor() {
    this.destroyRef.onDestroy(() => this.dispose());
    if (this.browser) {
      this.document.addEventListener(
        'fullscreenchange',
        this.onFullscreenChange,
      );
      this.document.addEventListener('keydown', this.onKeyDown);
      this.destroyRef.onDestroy(() => {
        this.document.removeEventListener(
          'fullscreenchange',
          this.onFullscreenChange,
        );
        this.document.removeEventListener('keydown', this.onKeyDown);
        this.restorePageScroll();
      });
    }
    afterNextRender(() => this.ready.set(true));
    effect(() => {
      if (!this.ready() || !this.browser) {
        return;
      }
      void this.render(this.object(), this.extent());
    });
    effect(() => this.updateIssueLines(this.issueLines()));
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

  rotateClockwise(): void {
    const runtime = this.runtime;
    if (!runtime || this.rotationAnimating) {
      return;
    }
    this.rotationAnimating = true;
    const start = performance.now();
    const duration = 250;
    const offset = runtime.camera.position.clone().sub(runtime.controls.target);
    const target = runtime.controls.target.clone();
    const axis = new runtime.THREE.Vector3(0, 1, 0);
    const animate = (now: number): void => {
      if (this.runtime !== runtime) {
        return;
      }
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const position = offset
        .clone()
        .applyAxisAngle(axis, (Math.PI / 2) * eased)
        .add(target);
      runtime.camera.position.copy(position);
      runtime.controls.target.copy(target);
      runtime.controls.update();
      if (progress < 1) {
        this.rotationFrame = requestAnimationFrame(animate);
        return;
      }
      this.rotationAnimating = false;
      this.rotationFrame = 0;
    };
    this.rotationFrame = requestAnimationFrame(animate);
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
    if (this.isExpanded()) {
      await this.exitExpanded(container);
      return;
    }
    try {
      if (!container.requestFullscreen) {
        throw new Error('Fullscreen API unavailable');
      }
      await container.requestFullscreen();
      if (this.document.fullscreenElement === container) {
        this.isExpanded.set(true);
        this.scheduleResize();
        return;
      }
    } catch {
      // Mobile browsers can reject fullscreen even when the API is present.
    }
    this.enterFallbackFullscreen();
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
      scene.background = new THREE.Color('#EAF3FC');
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
      const issueLines = new THREE.Group();
      scene.add(issueLines);
      host.replaceChildren(renderer.domElement);
      const controls = new controlsModule.OrbitControls(
        camera,
        renderer.domElement,
      );
      controls.enableDamping = true;
      controls.addEventListener('start', () => this.cancelRotation());
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
        issueLines,
        frame: 0,
      };
      this.runtime = runtime;
      this.updateIssueLines(this.issueLines());
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

  private updateIssueLines(lines: readonly ViewerIssueLine[]): void {
    const runtime = this.runtime;
    if (!runtime) {
      return;
    }
    this.disposeObject(runtime.issueLines);
    runtime.issueLines.clear();
    for (const line of lines) {
      if (line.positions.length === 0) {
        continue;
      }
      const geometry = new runtime.THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new runtime.THREE.Float32BufferAttribute(line.positions, 3),
      );
      const material = new runtime.THREE.LineBasicMaterial({
        color: line.color,
        depthTest: false,
        transparent: true,
        opacity: 0.95,
      });
      const segments = new runtime.THREE.LineSegments(geometry, material);
      segments.renderOrder = 1;
      runtime.issueLines.add(segments);
    }
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

  private async exitExpanded(container: HTMLDivElement | null): Promise<void> {
    if (this.document.fullscreenElement === container) {
      await this.document.exitFullscreen();
      return;
    }
    this.isFallbackExpanded.set(false);
    this.isExpanded.set(false);
    this.restorePageScroll();
    this.scheduleResize();
  }

  private enterFallbackFullscreen(): void {
    this.expandedScrollY = this.document.defaultView?.scrollY ?? 0;
    this.previousBodyStyle = this.document.body.style.cssText;
    this.document.body.style.position = 'fixed';
    this.document.body.style.top = '-' + this.expandedScrollY + 'px';
    this.document.body.style.width = '100%';
    this.document.body.style.overflow = 'hidden';
    this.isFallbackExpanded.set(true);
    this.isExpanded.set(true);
    this.scheduleResize();
  }

  private readonly onFullscreenChange = (): void => {
    const container = this.container()?.nativeElement;
    if (this.document.fullscreenElement === container) {
      this.isExpanded.set(true);
    } else if (!this.isFallbackExpanded()) {
      this.isExpanded.set(false);
    }
    this.scheduleResize();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.isFallbackExpanded()) {
      void this.exitExpanded(this.container()?.nativeElement ?? null);
    }
  };

  private scheduleResize(): void {
    requestAnimationFrame(() => {
      if (this.runtime) {
        this.resize(this.runtime);
      }
    });
  }

  private restorePageScroll(): void {
    if (!this.isFallbackExpanded() && !this.previousBodyStyle) {
      return;
    }
    this.document.body.style.cssText = this.previousBodyStyle;
    this.previousBodyStyle = '';
    this.document.defaultView?.scrollTo(0, this.expandedScrollY);
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
    this.cancelRotation();
    runtime.controls.dispose();
    this.disposeObject(runtime.issueLines);
    this.disposeObject(runtime.object);
    runtime.renderer.dispose();
    runtime.renderer.domElement.remove();
    this.runtime = null;
  }

  private cancelRotation(): void {
    if (this.rotationFrame) {
      cancelAnimationFrame(this.rotationFrame);
      this.rotationFrame = 0;
    }
    this.rotationAnimating = false;
  }

  private disposeObject(object: import('three').Object3D): void {
    object.traverse((child) => {
      const drawable = child as unknown as {
        readonly isMesh?: boolean;
        readonly isLine?: boolean;
        readonly geometry: import('three').BufferGeometry;
        readonly material:
          import('three').Material | import('three').Material[];
      };
      if (!drawable.isMesh && !drawable.isLine) {
        return;
      }
      drawable.geometry.dispose();
      const materials = Array.isArray(drawable.material)
        ? drawable.material
        : [drawable.material];
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
