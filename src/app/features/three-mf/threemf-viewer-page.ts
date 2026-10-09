import { GuideRouteUrl } from '../../core/seo/guide-routes';
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
import { Subscription } from 'rxjs';
import { JobsService } from '../../core/api/jobs.service';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { JobCreationService } from '../../core/api/job-creation.service';
import { pollJob } from '../../core/api/job-polling';
import { createAndUploadThreeMfJob } from '../../core/api/three-mf-job-workflow';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { Job, JobStatus } from '../../models/job';
import { MeshQualityReport } from '../../models/mesh-quality-report';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import { ViewerIssueLine } from '../shared/object-viewer/object-viewer';
import { MeshIssueHighlightsComponent } from '../shared/mesh-issue-highlights/mesh-issue-highlights';

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
  readonly centre: readonly [number, number, number];
}

@Component({
  selector: 'app-three-mf-viewer-page',
  imports: [ObjectViewerComponent, MeshIssueHighlightsComponent, RouterLink],
  templateUrl: './threemf-viewer-page.html',
  styleUrl: './threemf-viewer-page.scss',
})
export class ThreeMfViewerPage {
  readonly guideRouteUrl = GuideRouteUrl;
  readonly routeUrl = PublicRouteUrl;
  readonly picker = viewChild<ElementRef<HTMLInputElement>>('picker');
  readonly error = signal('');
  readonly model = signal<ModelInfo | null>(null);
  readonly loading = signal(false);
  readonly webglUnavailable = signal(false);
  readonly analyzingIssues = signal(false);
  readonly issueAnalysisError = signal('');
  readonly issueReport = signal<MeshQualityReport | null>(null);
  readonly issueLines = signal<readonly ViewerIssueLine[]>([]);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly seo = inject(SeoService);
  private readonly jobs = inject(JobsService);
  private readonly analytics = inject(AnalyticsService);
  private readonly jobCreation = inject(JobCreationService);
  private readonly destroyRef = inject(DestroyRef);
  private issuePolling?: Subscription;

  constructor() {
    this.seo.apply({
      title: 'Free 3MF Viewer with Measurements and Dimensions | InspectMesh',
      description:
        'Open a 3MF file locally, inspect its resolved build geometry, measure point-to-point distances and review declared units and dimensions before 3D printing.',
      path: PublicRouteUrl.ThreeMfViewer,
    });
    this.destroyRef.onDestroy(() => this.issuePolling?.unsubscribe());
  }

  openPicker(): void {
    this.picker()?.nativeElement.click();
  }

  trackMeasurement(
    event: 'enabled' | 'first_point' | 'completed' | 'cleared',
  ): void {
    const events = {
      enabled: 'viewer_measurement_mode_enabled',
      first_point: 'viewer_measurement_first_point_selected',
      completed: 'viewer_measurement_completed',
      cleared: 'viewer_measurement_cleared',
    } as const;
    this.analytics.trackViewerMeasurement(events[event], '3mf');
  }

  hasUsableUnit(unit: string): boolean {
    return [
      'micron',
      'millimeter',
      'centimeter',
      'inch',
      'foot',
      'meter',
    ].includes(unit.toLowerCase());
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

  analyzeIssues(): void {
    const file = this.sourceFile;
    if (!file || this.analyzingIssues()) {
      return;
    }
    this.issueAnalysisError.set('');
    this.analyzingIssues.set(true);
    let createdJob: Job | null = null;
    createAndUploadThreeMfJob(this.jobCreation, this.jobs, file, (job) => {
      createdJob = job;
    }).subscribe({
      next: () => {
        if (!createdJob) {
          this.analysisFailed(
            'We could not start issue analysis. Please try again.',
          );
          return;
        }
        this.issuePolling?.unsubscribe();
        this.issuePolling = pollJob(this.jobs, createdJob.id).subscribe({
          next: (job) => this.receiveIssueJob(job),
          error: () =>
            this.analysisFailed(
              'We could not retrieve issue analysis. Please try again.',
            ),
        });
      },
      error: () =>
        this.analysisFailed(
          'We could not start issue analysis. Please try again.',
        ),
    });
  }

  private async load(file: File): Promise<void> {
    this.issuePolling?.unsubscribe();
    this.issuePolling = undefined;
    this.error.set('');
    this.model.set(null);
    this.issueReport.set(null);
    this.issueAnalysisError.set('');
    this.issueLines.set([]);
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
        'This file is over the 25 MiB limit. Choose a smaller 3MF file.',
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
      this.sourceFile = file;
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
        centre: [centre.x, centre.y, centre.z],
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

  private sourceFile: File | null = null;

  private receiveIssueJob(job: Job): void {
    if (job.status === JobStatus.Completed) {
      this.issueReport.set(job.report ?? null);
      this.analyzingIssues.set(false);
    } else if (job.status === JobStatus.Failed) {
      this.analysisFailed(
        'Issue analysis did not complete. You can try again.',
      );
    }
  }

  private analysisFailed(message: string): void {
    this.analyzingIssues.set(false);
    this.issueAnalysisError.set(message);
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
