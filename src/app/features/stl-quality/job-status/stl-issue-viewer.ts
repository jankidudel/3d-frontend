import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';

type RecordValue = Record<string, unknown>;

@Component({
  selector: 'app-stl-issue-viewer',
  template:
    '<div #viewport class="issue-viewport" role="img" aria-label="Local STL model with sampled issue highlights"></div>',
  styleUrl: './stl-issue-viewer.scss',
})
export class StlIssueViewer implements AfterViewInit {
  readonly file = input.required<File>();
  readonly highlights = input.required<unknown>();
  private readonly viewport =
    viewChild.required<ElementRef<HTMLDivElement>>('viewport');
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);
  private disposed = false;
  constructor() {
    this.destroyRef.onDestroy(() => {
      this.disposed = true;
    });
  }
  ngAfterViewInit(): void {
    if (this.browser) {
      void this.render();
    }
  }
  private async render(): Promise<void> {
    const [{ STLLoader }, THREE, controlsModule] = await Promise.all([
      import('three/examples/jsm/loaders/STLLoader.js'),
      import('three'),
      import('three/examples/jsm/controls/OrbitControls.js'),
    ]);
    if (this.disposed) {
      return;
    }
    const geometry = new STLLoader().parse(await this.file().arrayBuffer());
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box || this.disposed) {
      geometry.dispose();
      return;
    }
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    geometry.translate(-centre.x, -centre.y, -centre.z);
    const host = this.viewport().nativeElement;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f7f8fa');
    const camera = new THREE.PerspectiveCamera(
      45,
      1,
      0.001,
      Math.max(100, Math.max(size.x, size.y, size.z) * 1000),
    );
    const material = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.65,
    });
    scene.add(new THREE.HemisphereLight('#ffffff', '#94a3b8', 2));
    scene.add(new THREE.Mesh(geometry, material));
    this.addHighlights(THREE, scene, centre);
    host.replaceChildren(renderer.domElement);
    const controls = new controlsModule.OrbitControls(
      camera,
      renderer.domElement,
    );
    controls.enableDamping = true;
    const distance = Math.max(size.x, size.y, size.z) * 1.8 || 10;
    camera.position.set(distance, distance * 0.7, distance);
    controls.update();
    const resize = (): void => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    const animate = (): void => {
      if (this.disposed) {
        observer.disconnect();
        controls.dispose();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        return;
      }
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();
  }
  private addHighlights(
    THREE: typeof import('three'),
    scene: import('three').Scene,
    centre: import('three').Vector3,
  ): void {
    const samples = this.record(this.record(this.highlights())?.['samples']);
    if (!samples) {
      return;
    }
    const colors: Record<string, string> = {
      open_edge: '#eab308',
      non_manifold_edge: '#f97316',
      duplicate_triangle: '#16a34a',
      degenerate_triangle: '#16a34a',
      inconsistent_orientation: '#7c3aed',
    };
    for (const [code, values] of Object.entries(samples)) {
      if (!Array.isArray(values) || !colors[code]) {
        continue;
      }
      const positions: number[] = [];
      for (const value of values) {
        const sample = this.record(value);
        const a = this.point(sample?.['a']);
        const b = this.point(sample?.['b']);
        if (a && b) {
          positions.push(
            a[0] - centre.x,
            a[1] - centre.y,
            a[2] - centre.z,
            b[0] - centre.x,
            b[1] - centre.y,
            b[2] - centre.z,
          );
        }
      }
      if (positions.length) {
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(positions, 3),
        );
        scene.add(
          new THREE.LineSegments(
            lineGeometry,
            new THREE.LineBasicMaterial({ color: colors[code] }),
          ),
        );
      }
    }
  }
  private record(value: unknown): RecordValue | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as RecordValue)
      : null;
  }
  private point(value: unknown): readonly [number, number, number] | null {
    const point = this.record(value);
    return typeof point?.['x'] === 'number' &&
      typeof point['y'] === 'number' &&
      typeof point['z'] === 'number'
      ? [point['x'], point['y'], point['z']]
      : null;
  }
}
