import { DOCUMENT, DecimalPipe, isPlatformBrowser } from '@angular/common';
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
  readonly measurement: import('three').Group;
  readonly crossSectionGuide: import('three').Group;
  frame: number;
}

export interface ViewerIssueLine {
  readonly color: string;
  readonly positions: readonly number[];
}

interface MeasurementResult {
  readonly distance: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface MeasurementLabelPosition {
  readonly x: number;
  readonly y: number;
  readonly visible: boolean;
}

@Component({
  selector: 'app-object-viewer',
  imports: [DecimalPipe],
  templateUrl: './object-viewer.html',
  styleUrl: './object-viewer.scss',
})
export class ObjectViewerComponent {
  readonly object = input.required<import('three').Object3D>();
  readonly extent = input.required<number>();
  /** Optional common camera framing for original/candidate review. */
  readonly frameExtent = input<number | null>(null);
  readonly ariaLabel = input.required<string>();
  readonly issueLines = input<readonly ViewerIssueLine[]>([]);
  readonly scrollOnRender = input(true);
  readonly preserveVertexColors = input(false);
  readonly measurementUnit = input('model units');
  readonly measurementAvailable = input(true);
  readonly showMeasurementControls = input(true);
  readonly showCrossSectionControls = input(true);
  readonly chooseAnotherAvailable = input(true);
  readonly selectedPlacedItem = input<string | null>(null);
  readonly isolatedPlacedItem = input<string | null>(null);
  readonly placedItemSelected = output<string>();
  /** Original triangle IDs supplied by batched mesh previews. */
  readonly triangleInteraction = input(false);
  readonly triangleSelected = output<number>();
  readonly triangleHovered = output<number | null>();
  readonly chooseAnother = output<void>();
  readonly resetView = output<void>();
  readonly rendered = output<void>();
  readonly renderFailed = output<void>();
  readonly measurementModeEnabled = output<void>();
  readonly measurementFirstPointSelected = output<void>();
  readonly measurementCompleted = output<void>();
  readonly measurementCleared = output<void>();
  readonly viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');
  readonly container = viewChild<ElementRef<HTMLDivElement>>('container');
  readonly modelColor = signal('#7B8794');
  readonly isExpanded = signal(false);
  readonly isFallbackExpanded = signal(false);
  readonly measuring = signal(false);
  readonly measurement = signal<MeasurementResult | null>(null);
  readonly measurementLabelPosition = signal<MeasurementLabelPosition>({
    x: 0,
    y: 0,
    visible: false,
  });
  readonly measurementHint = signal(
    'Activate measurement mode to select two points.',
  );
  readonly crossSectionEnabled = signal(false);
  readonly crossSectionAxis = signal<'x' | 'y' | 'z'>('z');
  readonly crossSectionPosition = signal(50);
  readonly crossSectionGuideVisible = signal(true);
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
  private measurementPoints: import('three').Vector3[] = [];
  private measurementPreview: import('three').Vector3 | null = null;
  private triangleHoverTime = 0;
  private pointerStart: { readonly x: number; readonly y: number } | null =
    null;

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
    effect(() => {
      this.selectedPlacedItem();
      this.isolatedPlacedItem();
      this.updatePlacedItems();
    });
    effect(() => {
      this.crossSectionEnabled();
      this.crossSectionAxis();
      this.crossSectionPosition();
      this.crossSectionGuideVisible();
      this.updateCrossSection();
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

  toggleMeasurement(): void {
    if (!this.measurementAvailable()) {
      return;
    }
    const active = !this.measuring();
    this.measuring.set(active);
    this.measurementHint.set(
      active
        ? 'Measurement mode: tap or click a visible point on the model.'
        : 'Measurement mode is off.',
    );
    if (active) {
      this.measurementModeEnabled.emit();
    }
  }

  clearMeasurement(): void {
    this.measurementPoints = [];
    this.measurementPreview = null;
    this.measurement.set(null);
    this.measurementHint.set(
      this.measuring()
        ? 'Measurement mode: tap or click a visible point on the model.'
        : 'Activate measurement mode to select two points.',
    );
    this.updateMeasurementOverlay();
    this.measurementCleared.emit();
  }

  toggleCrossSection(): void {
    this.crossSectionEnabled.update((enabled) => !enabled);
  }

  onCrossSectionAxisChange(event: Event): void {
    this.crossSectionAxis.set(
      (event.target as HTMLSelectElement).value as 'x' | 'y' | 'z',
    );
  }

  onCrossSectionPositionChange(event: Event): void {
    this.crossSectionPosition.set(
      Number((event.target as HTMLInputElement).value),
    );
  }

  onCrossSectionGuideChange(event: Event): void {
    this.crossSectionGuideVisible.set(
      (event.target as HTMLInputElement).checked,
    );
  }

  onViewportPointerDown(event: PointerEvent): void {
    this.pointerStart = { x: event.clientX, y: event.clientY };
  }

  onViewportPointerUp(event: PointerEvent): void {
    const start = this.pointerStart;
    this.pointerStart = null;
    if (
      !start ||
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8
    ) {
      return;
    }
    if (this.measuring()) {
      this.selectMeasurementPoint(event);
    } else {
      const runtime = this.runtime;
      const host = this.viewport()?.nativeElement;
      if (!runtime || !host) {
        return;
      }
      const rect = host.getBoundingClientRect();
      const raycaster = new runtime.THREE.Raycaster();
      raycaster.setFromCamera(
        new runtime.THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          (-(event.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        runtime.camera,
      );
      const intersections = raycaster.intersectObject(runtime.object, true);
      const triangleHit = intersections.find(
        (hit) =>
          hit.object.visible &&
          hit.faceIndex != null &&
          hit.object.userData['sourceFaces'],
      );
      if (
        this.triangleInteraction() &&
        triangleHit &&
        triangleHit.faceIndex != null
      ) {
        this.triangleSelected.emit(
          (triangleHit.object.userData['sourceFaces'] as Uint32Array)[
            triangleHit.faceIndex
          ],
        );
        return;
      }
      const hit = intersections.find(
        (hit) => hit.object.visible && hit.object.userData['placedItemId'],
      );
      if (hit) {
        this.placedItemSelected.emit(
          hit.object.userData['placedItemId'] as string,
        );
      }
    }
  }

  onViewportPointerMove(event: PointerEvent): void {
    if (
      !this.measuring() &&
      this.triangleInteraction() &&
      performance.now() - this.triangleHoverTime > 150
    ) {
      this.triangleHoverTime = performance.now();
      const runtime = this.runtime;
      const host = this.viewport()?.nativeElement;
      if (runtime && host) {
        const rect = host.getBoundingClientRect();
        const ray = new runtime.THREE.Raycaster();
        ray.setFromCamera(
          new runtime.THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
          ),
          runtime.camera,
        );
        const hit = ray
          .intersectObject(runtime.object, true)
          .find(
            (hit) =>
              hit.object.visible &&
              hit.faceIndex != null &&
              hit.object.userData['sourceFaces'],
          );
        this.triangleHovered.emit(
          hit && hit.faceIndex != null
            ? (hit.object.userData['sourceFaces'] as Uint32Array)[hit.faceIndex]
            : null,
        );
      }
    }
    if (!this.measuring() || this.measurementPoints.length !== 1) {
      return;
    }
    this.measurementPreview = this.intersectMeasurementPoint(event);
    this.updateMeasurementOverlay();
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
      renderer.localClippingEnabled = true;
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
      const measurement = new THREE.Group();
      scene.add(measurement);
      const crossSectionGuide = new THREE.Group();
      scene.add(crossSectionGuide);
      host.replaceChildren(renderer.domElement);
      const controls = new controlsModule.OrbitControls(
        camera,
        renderer.domElement,
      );
      controls.enableDamping = true;
      controls.addEventListener('start', () => this.cancelRotation());
      controls.minDistance = Math.max(extent * 0.05, 0.01);
      controls.maxDistance = Math.max(extent * 20, 100);
      if (!this.preserveVertexColors()) {
        this.applyModelColor(object, this.modelColor());
      }
      const runtime: ViewerRuntime = {
        THREE,
        renderer,
        scene,
        camera,
        controls,
        object,
        issueLines,
        measurement,
        crossSectionGuide,
        frame: 0,
      };
      this.runtime = runtime;
      this.updateIssueLines(this.issueLines());
      this.updateMeasurementOverlay();
      this.updateCrossSection();
      this.updatePlacedItems();
      this.frame(runtime);
      this.observer = new ResizeObserver(() => this.resize(runtime));
      this.observer.observe(host);
      this.resize(runtime);
      const animate = (): void => {
        if (this.runtime !== runtime) {
          return;
        }
        controls.update();
        this.updateMeasurementLabel(runtime);
        renderer.render(scene, camera);
        runtime.frame = requestAnimationFrame(animate);
      };
      runtime.frame = requestAnimationFrame(animate);
      this.rendered.emit();
      if (this.scrollOnRender()) {
        this.scrollIntoView(runtime);
      }
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

  private updatePlacedItems(): void {
    const runtime = this.runtime;
    if (!runtime) {
      return;
    }
    runtime.object.traverse((child) => {
      const mesh = child as import('three').Mesh;
      const id = child.userData['placedItemId'];
      if (!mesh.isMesh || !id) {
        return;
      }
      mesh.visible =
        !this.isolatedPlacedItem() || id === this.isolatedPlacedItem();
      const material = mesh.material as import('three').MeshStandardMaterial;
      const selected = id === this.selectedPlacedItem();
      material.emissive.set(selected ? '#425d79' : '#000000');
      material.wireframe = selected;
    });
  }
  framePlacedItem(id: string | null): void {
    const runtime = this.runtime;
    if (!runtime || !id) {
      return;
    }
    const item = runtime.object.children.find(
      (child) => child.userData['placedItemId'] === id,
    );
    if (!item) {
      return;
    }
    const box = new runtime.THREE.Box3().setFromObject(item);
    const centre = box.getCenter(new runtime.THREE.Vector3());
    const size = box.getSize(new runtime.THREE.Vector3());
    const distance = Math.max(size.x, size.y, size.z) * 1.8 || 10;
    runtime.controls.target.copy(centre);
    runtime.camera.position
      .copy(centre)
      .add(new runtime.THREE.Vector3(distance, distance * 0.7, distance));
    runtime.controls.update();
  }
  frameBounds(min: readonly number[], max: readonly number[]): void {
    const runtime = this.runtime;
    if (!runtime) {
      return;
    }
    const centre = new runtime.THREE.Vector3(...min)
      .add(new runtime.THREE.Vector3(...max))
      .multiplyScalar(0.5);
    const distance =
      Math.max(...max.map((value, axis) => value - min[axis])) * 1.1 || 10;
    runtime.controls.target.copy(centre);
    runtime.camera.position
      .copy(centre)
      .add(new runtime.THREE.Vector3(distance, distance * 0.7, distance));
    runtime.controls.update();
  }
  private frame(runtime: ViewerRuntime): void {
    const box = new runtime.THREE.Box3().setFromObject(runtime.object);
    const size = box.getSize(new runtime.THREE.Vector3());
    const distance =
      (this.frameExtent() ?? Math.max(size.x, size.y, size.z)) * 1.8 || 10;
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

  private updateCrossSection(): void {
    const runtime = this.runtime;
    if (!runtime) {
      return;
    }
    this.disposeObject(runtime.crossSectionGuide);
    runtime.crossSectionGuide.clear();
    if (!this.crossSectionEnabled()) {
      this.applyClippingPlane(runtime.object, null);
      return;
    }

    const bounds = new runtime.THREE.Box3().setFromObject(runtime.object);
    const axis = this.crossSectionAxis();
    const minimum = bounds.min[axis];
    const maximum = bounds.max[axis];
    const position =
      minimum + ((maximum - minimum) * this.crossSectionPosition()) / 100;
    const normal = new runtime.THREE.Vector3(
      axis === 'x' ? 1 : 0,
      axis === 'y' ? 1 : 0,
      axis === 'z' ? 1 : 0,
    );
    const plane = new runtime.THREE.Plane(normal, -position);
    this.applyClippingPlane(runtime.object, plane);

    if (this.crossSectionGuideVisible()) {
      const size = Math.max(
        bounds.max.x - bounds.min.x,
        bounds.max.y - bounds.min.y,
        bounds.max.z - bounds.min.z,
        1,
      );
      runtime.crossSectionGuide.add(
        new runtime.THREE.PlaneHelper(plane, size * 1.1, '#0b70c9'),
      );
    }
  }

  private applyClippingPlane(
    object: import('three').Object3D,
    plane: import('three').Plane | null,
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
        const clippingMaterial = material as import('three').Material & {
          clippingPlanes: import('three').Plane[] | null;
        };
        clippingMaterial.clippingPlanes = plane ? [plane] : null;
        clippingMaterial.needsUpdate = true;
      }
    });
  }

  private selectMeasurementPoint(event: PointerEvent): void {
    const point = this.intersectMeasurementPoint(event);
    if (!point) {
      this.measurementHint.set(
        'No visible mesh point was selected. Try again on the model.',
      );
      return;
    }
    if (this.measurementPoints.length === 2) {
      this.measurementPoints = [];
    }
    this.measurementPoints.push(point);
    this.measurementPreview = null;
    if (this.measurementPoints.length === 1) {
      this.measurementHint.set('Point A selected. Select point B.');
      this.measurementFirstPointSelected.emit();
    } else {
      const [a, b] = this.measurementPoints;
      this.measurement.set({
        distance: a.distanceTo(b),
        x: Math.abs(b.x - a.x),
        y: Math.abs(b.y - a.y),
        z: Math.abs(b.z - a.z),
      });
      this.measurementHint.set(
        'Measurement complete. Select another point to start a new measurement.',
      );
      this.measurementCompleted.emit();
    }
    this.updateMeasurementOverlay();
  }

  private intersectMeasurementPoint(
    event: PointerEvent,
  ): import('three').Vector3 | null {
    const runtime = this.runtime;
    const host = this.viewport()?.nativeElement;
    if (!runtime || !host) {
      return null;
    }
    const bounds = host.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) {
      return null;
    }
    const pointer = new runtime.THREE.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    const raycaster = new runtime.THREE.Raycaster();
    raycaster.setFromCamera(pointer, runtime.camera);
    return (
      raycaster.intersectObject(runtime.object, true)[0]?.point.clone() ?? null
    );
  }

  private updateMeasurementOverlay(): void {
    const runtime = this.runtime;
    if (!runtime) {
      return;
    }
    this.disposeObject(runtime.measurement);
    runtime.measurement.clear();
    const markerRadius = Math.max(this.extent() * 0.012, 0.1);
    const markerMaterial = new runtime.THREE.MeshBasicMaterial({
      color: '#c0392b',
      depthTest: false,
    });
    for (const point of this.measurementPoints) {
      const marker = new runtime.THREE.Mesh(
        new runtime.THREE.SphereGeometry(markerRadius, 16, 12),
        markerMaterial.clone(),
      );
      marker.position.copy(point);
      marker.renderOrder = 2;
      runtime.measurement.add(marker);
    }
    const endPoint = this.measurementPoints[1] ?? this.measurementPreview;
    if (this.measurementPoints.length > 0 && endPoint) {
      const geometry = new runtime.THREE.BufferGeometry().setFromPoints([
        this.measurementPoints[0],
        endPoint,
      ]);
      const line = new runtime.THREE.Line(
        geometry,
        new runtime.THREE.LineBasicMaterial({
          color: '#c0392b',
          depthTest: false,
          transparent: true,
          opacity: this.measurementPreview ? 0.75 : 1,
        }),
      );
      line.renderOrder = 2;
      runtime.measurement.add(line);
    }
  }

  private updateMeasurementLabel(runtime: ViewerRuntime): void {
    const points = this.measurementPoints;
    const host = this.viewport()?.nativeElement;
    if (points.length !== 2 || !host) {
      return;
    }
    const midpoint = points[0]
      .clone()
      .add(points[1])
      .multiplyScalar(0.5)
      .project(runtime.camera);
    this.measurementLabelPosition.set({
      x: ((midpoint.x + 1) / 2) * host.clientWidth,
      y: ((1 - midpoint.y) / 2) * host.clientHeight,
      visible: midpoint.z >= -1 && midpoint.z <= 1,
    });
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
        const viewport = this.viewport()?.nativeElement;
        if (!viewport || typeof viewport.scrollIntoView !== 'function') {
          return;
        }
        viewport.scrollIntoView({
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
    this.disposeObject(runtime.crossSectionGuide);
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
