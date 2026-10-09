import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import {
  ReviewSession,
  ReviewDestination,
} from '../repeat-workflows/review-session';
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
import {
  ObjectViewerComponent,
  ViewerIssueLine,
} from '../shared/object-viewer/object-viewer';
import { MeshIssueHighlightsComponent } from '../shared/mesh-issue-highlights/mesh-issue-highlights';
import { JobsService } from '../../core/api/jobs.service';
import { StlJobService } from '../../core/api/stl-job.service';
import {
  createAndUploadStlJob,
  pollStlJob,
} from '../../core/api/stl-job-workflow';
import { Job, JobStatus } from '../../models/job';
import { MeshQualityReport } from '../../models/mesh-quality-report';

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
  imports: [
    ToolEvidenceComponent,
    ObjectViewerComponent,
    MeshIssueHighlightsComponent,
    RouterLink,
  ],
  templateUrl: './stl-viewer-page.html',
  styleUrl: '../shared/model-viewer-page.scss',
})
export class StlViewerPage {
  readonly guideRouteUrl = GuideRouteUrl;
  readonly handoff = signal(
    inject(ReviewSession).take(ReviewDestination.Viewer),
  );
  readonly fromCollection = this.handoff() !== null;
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
  readonly selectedUnit = signal('');
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  private readonly jobs = inject(JobsService);
  private readonly stlJobs = inject(StlJobService);
  private issuePolling?: Subscription;

  async openHandoff(): Promise<void> {
    const item = this.handoff();
    if (!item) {
      return;
    }
    this.handoff.set(null);
    this.selectedUnit.set(item.unit);
    await this.load(item.file);
  }
  constructor() {
    this.seo.apply({
      title:
        'Free STL Viewer Online - Open and Inspect STL Files | InspectMesh',
      description:
        'Open an STL file locally, inspect it in 3D, measure point-to-point distances and review dimensions and triangle count before 3D printing.',
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

  onUnitChange(event: Event): void {
    this.selectedUnit.set((event.target as HTMLSelectElement).value);
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
    this.analytics.trackViewerMeasurement(events[event], 'stl');
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
        'This file is over the 25 MiB limit. Choose a smaller STL file.',
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
      this.issueLines.set([]);
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
