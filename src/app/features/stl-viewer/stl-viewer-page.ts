import {
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import { ViewerIssueLine } from '../shared/object-viewer/object-viewer';
import { JobsService } from '../../core/api/jobs.service';
import { StlJobService } from '../../core/api/stl-job.service';
import {
  createAndUploadStlJob,
  pollStlJob,
} from '../../core/api/stl-job-workflow';
import { Job, JobStatus } from '../../models/job';
import {
  MeshIssueEdgeSegments,
  MeshQualityReport,
} from '../../models/mesh-quality-report';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
interface ModelInfo {
  readonly name: string;
  readonly size: number;
  readonly triangles: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly object: import('three').Object3D;
  readonly extent: number;
  readonly centre: readonly [number, number, number];
}
@Component({
  selector: 'app-stl-viewer-page',
  imports: [ObjectViewerComponent, RouterLink],
  templateUrl: './stl-viewer-page.html',
  styleUrl: '../shared/model-viewer-page.scss',
})
export class StlViewerPage {
  readonly routeUrl = PublicRouteUrl;
  readonly picker = viewChild<ElementRef<HTMLInputElement>>('picker');
  readonly error = signal('');
  readonly model = signal<ModelInfo | null>(null);
  readonly loading = signal(false);
  readonly webglUnavailable = signal(false);
  readonly analyzingIssues = signal(false);
  readonly issueAnalysisError = signal('');
  readonly issueReport = signal<MeshQualityReport | null>(null);
  readonly showOpenEdges = signal(false);
  readonly showNonManifoldEdges = signal(false);
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  private readonly jobs = inject(JobsService);
  private readonly stlJobs = inject(StlJobService);
  private issuePolling?: Subscription;

  constructor() {
    this.seo.apply({
      title:
        'Free STL Viewer Online - Open and Inspect STL Files | InspectMesh',
      description:
        'Open and inspect STL files online in your browser. Rotate, zoom and pan your 3D model, then view its dimensions, triangle count and file size.',
      path: PublicRouteUrl.Viewer,
    });
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
  openQualityChecker(): void {
    this.analytics.trackStlViewerQualityOpened();
  }

  onResetView(): void {
    this.analytics.trackStlViewerReset();
  }

  analyzeIssues(): void {
    const file = this.sourceFile;
    if (!file || this.analyzingIssues()) {
      return;
    }
    this.issueAnalysisError.set('');
    this.analyzingIssues.set(true);
    let createdJob: Job | null = null;
    createAndUploadStlJob(this.stlJobs, this.jobs, file, (job) => {
      createdJob = job;
    }).subscribe({
      next: () => {
        if (!createdJob) {
          this.analyzingIssues.set(false);
          this.issueAnalysisError.set(
            'We could not start issue analysis. Please try again.',
          );
          return;
        }
        this.issuePolling?.unsubscribe();
        this.issuePolling = pollStlJob(this.jobs, createdJob.id).subscribe({
          next: (updated) => this.receiveIssueJob(updated),
          error: () => {
            this.analyzingIssues.set(false);
            this.issueAnalysisError.set(
              'We could not retrieve issue analysis. Please try again.',
            );
          },
        });
      },
      error: () => {
        this.analyzingIssues.set(false);
        this.issueAnalysisError.set(
          'We could not start issue analysis. Please try again.',
        );
      },
    });
  }

  clearHighlights(): void {
    this.showOpenEdges.set(false);
    this.showNonManifoldEdges.set(false);
  }

  setOpenEdges(event: Event): void {
    this.showOpenEdges.set((event.target as HTMLInputElement).checked);
  }

  setNonManifoldEdges(event: Event): void {
    this.showNonManifoldEdges.set((event.target as HTMLInputElement).checked);
  }

  issueLines(): readonly ViewerIssueLine[] {
    const model = this.model();
    const geometry = this.issueReport()?.issueGeometry;
    if (!model || !geometry) return [];
    const lines: ViewerIssueLine[] = [];
    if (this.showOpenEdges()) {
      lines.push(
        this.toViewerLine(geometry.openEdges, model.centre, '#e69f00'),
      );
    }
    if (this.showNonManifoldEdges()) {
      lines.push(
        this.toViewerLine(geometry.nonManifoldEdges, model.centre, '#cc79a7'),
      );
    }
    return lines.filter((line) => line.positions.length > 0);
  }

  private async load(file: File): Promise<void> {
    this.issuePolling?.unsubscribe();
    this.issuePolling = undefined;
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
      const [{ STLLoader }, three] = await Promise.all([
        import('three/examples/jsm/loaders/STLLoader.js'),
        import('three'),
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
      const centre = box.getCenter(new three.Vector3());
      geometry.translate(-centre.x, -centre.y, -centre.z);
      const material = new three.MeshStandardMaterial({
        color: '#7B8794',
        roughness: 0.58,
        metalness: 0.05,
      });
      this.sourceFile = file;
      this.issueReport.set(null);
      this.clearHighlights();
      this.model.set({
        name: file.name,
        size: file.size,
        triangles: geometry.getAttribute('position').count / 3,
        width: size.x,
        height: size.y,
        depth: size.z,
        object: new three.Mesh(geometry, material),
        extent: Math.max(size.x, size.y, size.z),
        centre: [centre.x, centre.y, centre.z],
      });
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

  private sourceFile: File | null = null;

  private receiveIssueJob(job: Job): void {
    if (job.status === JobStatus.Completed) {
      this.issueReport.set(job.report ?? null);
      const geometry = job.report?.issueGeometry;
      this.showOpenEdges.set((geometry?.openEdges?.totalCount ?? 0) > 0);
      this.showNonManifoldEdges.set(
        (geometry?.nonManifoldEdges?.totalCount ?? 0) > 0,
      );
      this.analyzingIssues.set(false);
      return;
    }
    if (job.status === JobStatus.Failed) {
      this.analyzingIssues.set(false);
      this.issueAnalysisError.set(
        'Issue analysis did not complete. You can try again.',
      );
    }
  }

  private toViewerLine(
    issue: MeshIssueEdgeSegments | undefined,
    centre: readonly [number, number, number],
    color: string,
  ): ViewerIssueLine {
    const positions: number[] = [];
    for (const segment of issue?.segments ?? []) {
      const start = this.point(segment.start);
      const end = this.point(segment.end);
      if (start && end)
        positions.push(
          start[0] - centre[0],
          start[1] - centre[1],
          start[2] - centre[2],
          end[0] - centre[0],
          end[1] - centre[1],
          end[2] - centre[2],
        );
    }
    return { color, positions };
  }

  private point(value: unknown): readonly [number, number, number] | null {
    if (
      Array.isArray(value) &&
      value.length === 3 &&
      value.every(
        (coordinate) =>
          typeof coordinate === 'number' && Number.isFinite(coordinate),
      )
    )
      return value as [number, number, number];
    if (typeof value === 'object' && value !== null) {
      const point = value as { x?: unknown; y?: unknown; z?: unknown };
      if (
        [point.x, point.y, point.z].every(
          (coordinate) =>
            typeof coordinate === 'number' && Number.isFinite(coordinate),
        )
      )
        return [point.x as number, point.y as number, point.z as number];
    }
    return null;
  }

  private fail(
    message: string,
    kind:
      'too_large' | 'wrong_extension' | 'parse_failed' | 'webgl_unavailable',
  ): void {
    this.error.set(message);
    this.analytics.trackStlViewerFailed(kind);
  }
  onRenderFailed(): void {
    this.webglUnavailable.set(true);
    this.model.set(null);
    this.fail(
      'WebGL is unavailable in this browser. You can still use the other tools.',
      'webgl_unavailable',
    );
  }
  onModelRendered(): void {
    const model = this.model();
    if (model) {
      this.analytics.trackStlViewerLoaded(model.size);
    }
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
