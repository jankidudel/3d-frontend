import { DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { JobsService } from '../../core/api/jobs.service';
import { uploadErrorMessage } from '../../core/api/upload-error';
import { StlJobService } from '../../core/api/stl-job.service';
import {
  createAndUploadStlSplitJob,
  pollStlJob,
  PollingTimeoutError,
} from '../../core/api/stl-job-workflow';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';
import { Job, JobStatus } from '../../models/job';
import { MeshQualityPdfService } from '../../shared/mesh-quality-pdf.service';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import { StlFilePicker } from '../stl-quality/stl-file-picker/stl-file-picker';

type Axis = 'X' | 'Y' | 'Z';
type Bounds = Record<Axis, { min: number; max: number }>;
interface SplitPartReport {
  readonly fileName: string;
  readonly triangleCount: number;
  readonly dimensions: {
    readonly width: number;
    readonly height: number;
    readonly depth: number;
  };
}
interface StlSplitReport {
  readonly split: {
    readonly axis: Axis;
    readonly positionPercent: number;
    readonly partA: SplitPartReport;
    readonly partB: SplitPartReport;
  };
}
@Component({
  selector: 'app-stl-splitter-page',
  imports: [RouterLink, StlFilePicker, JobProgress, ObjectViewerComponent],
  templateUrl: './stl-splitter-page.html',
  styleUrl: './stl-splitter-page.scss',
})
export class StlSplitterPage {
  readonly routeUrl = PublicRouteUrl;
  readonly jobStatus = JobStatus;
  readonly file = signal<File | null>(null);
  readonly axis = signal<Axis>('Z');
  readonly position = signal(50);
  readonly bounds = signal<Bounds | null>(null);
  readonly preview = signal<{
    object: import('three').Object3D;
    extent: number;
  } | null>(null);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly refreshing = signal(false);
  readonly timedOut = signal(false);
  readonly generatingPdf = signal(false);
  readonly reportDownloadError = signal('');
  readonly processing = computed(
    () =>
      this.job()?.status === JobStatus.Created ||
      this.job()?.status === JobStatus.Processing,
  );
  readonly report = computed(
    () => this.job()?.report as unknown as StlSplitReport | undefined,
  );
  readonly selectedBounds = computed(
    () => this.bounds()?.[this.axis()] ?? null,
  );
  readonly coordinate = computed(() => {
    const bounds = this.selectedBounds();
    return bounds
      ? bounds.min + ((bounds.max - bounds.min) * this.position()) / 100
      : null;
  });
  readonly canSplit = computed(
    () =>
      !!this.file() &&
      !!this.bounds() &&
      this.position() > 0 &&
      this.position() < 100 &&
      !this.submitting(),
  );
  private readonly jobs = inject(JobsService);
  private readonly stlJobs = inject(StlJobService);
  private readonly analytics = inject(AnalyticsService);
  private readonly pdf = inject(MeshQualityPdfService);
  private readonly document = inject(DOCUMENT);
  private readonly picker = viewChild(StlFilePicker);
  private readonly destroyRef = inject(DestroyRef);
  private polling?: Subscription;
  private previewFactory: {
    three: typeof import('three');
    geometry: import('three').BufferGeometry;
    centre: import('three').Vector3;
    size: import('three').Vector3;
  } | null = null;
  constructor() {
    inject(SeoService).apply({
      title: 'STL Splitter - Split STL Files for 3D Printing | InspectMesh',
      description:
        'Split a valid STL model into two capped printable parts along an X, Y or Z plane.',
      path: PublicRouteUrl.StlSplitter,
    });
    this.destroyRef.onDestroy(() => this.polling?.unsubscribe());
  }
  onFileSelected(file: File | null): void {
    this.file.set(file);
    this.job.set(null);
    this.bounds.set(null);
    this.preview.set(null);
    this.error.set('');
    if (file) {
      this.analytics.trackSplitter(
        AnalyticsEvent.SplitterUploadStarted,
        file.size,
      );
      void this.loadPreview(file);
    }
  }
  setAxis(value: Axis): void {
    this.axis.set(value);
    this.updatePreview();
  }
  setPosition(value: number): void {
    this.position.set(Math.max(0, Math.min(100, value)));
    this.updatePreview();
  }
  split(): void {
    const file = this.file();
    if (!file || !this.canSplit()) {
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.analytics.trackSplitter(AnalyticsEvent.SplitterSplitStarted);
    createAndUploadStlSplitJob(
      this.stlJobs,
      this.jobs,
      file,
      this.axis(),
      this.position(),
      (job) => this.job.set(job),
    ).subscribe({
      next: () => {
        this.submitting.set(false);
        const job = this.job();
        if (job) {
          this.poll(job.id);
        }
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(uploadErrorMessage(error));
        this.analytics.trackSplitter(AnalyticsEvent.SplitterFailed);
      },
    });
  }
  refresh(): void {
    const job = this.job();
    if (!job) {
      return;
    }
    this.refreshing.set(true);
    this.jobs
      .getJob(job.id)
      .pipe(finalize(() => this.refreshing.set(false)))
      .subscribe({
        next: (value) => {
          this.job.set(value);
          this.trackCompletion(value);
        },
        error: () =>
          this.error.set(
            'We could not refresh this split job. Please try again.',
          ),
      });
  }
  downloadPart(part: 'a' | 'b'): void {
    this.analytics.trackSplitter(
      part === 'a'
        ? AnalyticsEvent.SplitterPartADownloaded
        : AnalyticsEvent.SplitterPartBDownloaded,
    );
  }
  downloadJsonReport(): void {
    const report = this.job()?.report;
    const view = this.document.defaultView;
    if (!report || !view) {
      return;
    }
    const url = view.URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
    );
    const link = this.document.createElement('a');
    link.href = url;
    link.download = 'stl-split-report.json';
    link.click();
    this.analytics.trackSplitter(AnalyticsEvent.SplitterJsonDownloaded);
    view.setTimeout(() => view.URL.revokeObjectURL(url), 0);
  }
  async downloadPdfReport(): Promise<void> {
    const job = this.job();
    if (!job || this.generatingPdf()) {
      return;
    }
    this.generatingPdf.set(true);
    this.reportDownloadError.set('');
    try {
      await this.pdf.download(job);
      this.analytics.trackSplitter(AnalyticsEvent.SplitterPdfDownloaded);
    } catch {
      this.reportDownloadError.set(
        'We could not generate the PDF report. Please try again.',
      );
    } finally {
      this.generatingPdf.set(false);
    }
  }
  format(value: number | null): string {
    return value === null
      ? 'Not available'
      : new Intl.NumberFormat('en', { maximumFractionDigits: 3 }).format(value);
  }
  private poll(id: string): void {
    this.polling = pollStlJob(this.jobs, id).subscribe({
      next: (job) => {
        this.job.set(job);
        this.trackCompletion(job);
      },
      error: (error) => {
        this.timedOut.set(error instanceof PollingTimeoutError);
        this.error.set(
          'Automatic status updates were interrupted. Please refresh the result.',
        );
      },
    });
  }
  private trackCompletion(job: Job): void {
    if (job.status === JobStatus.Completed) {
      this.analytics.trackSplitter(AnalyticsEvent.SplitterCompleted);
    } else if (job.status === JobStatus.Failed) {
      this.analytics.trackSplitter(AnalyticsEvent.SplitterFailed);
    }
  }
  private async loadPreview(file: File): Promise<void> {
    try {
      const [{ STLLoader }, three] = await Promise.all([
        import('three/examples/jsm/loaders/STLLoader.js'),
        import('three'),
      ]);
      const geometry = new STLLoader().parse(await file.arrayBuffer());
      geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      if (!box) {
        throw new Error('Missing bounds');
      }
      const centre = box.getCenter(new three.Vector3());
      const size = box.getSize(new three.Vector3());
      geometry.translate(-centre.x, -centre.y, -centre.z);
      this.bounds.set({
        X: { min: box.min.x, max: box.max.x },
        Y: { min: box.min.y, max: box.max.y },
        Z: { min: box.min.z, max: box.max.z },
      });
      this.previewFactory = { three, geometry, centre, size };
      this.updatePreview();
    } catch {
      this.error.set(
        'We could not read that STL file. Choose a valid ASCII or binary STL file.',
      );
    }
  }
  private updatePreview(): void {
    const factory = this.previewFactory;
    const coordinate = this.coordinate();
    if (!factory || coordinate === null) {
      return;
    }
    const { three, geometry, centre, size } = factory;
    const group = new three.Group();
    const direction =
      this.axis() === 'X'
        ? new three.Vector3(1, 0, 0)
        : this.axis() === 'Y'
          ? new three.Vector3(0, 1, 0)
          : new three.Vector3(0, 0, 1);
    const localCut =
      coordinate -
      (this.axis() === 'X'
        ? centre.x
        : this.axis() === 'Y'
          ? centre.y
          : centre.z);
    group.add(
      new three.Mesh(
        geometry,
        new three.MeshStandardMaterial({
          color: '#4f86c6',
          transparent: true,
          opacity: 0.58,
          side: three.DoubleSide,
          clippingPlanes: [
            new three.Plane(direction.clone().negate(), localCut),
          ],
        }),
      ),
      new three.Mesh(
        geometry,
        new three.MeshStandardMaterial({
          color: '#d78a57',
          transparent: true,
          opacity: 0.58,
          side: three.DoubleSide,
          clippingPlanes: [new three.Plane(direction, -localCut)],
        }),
      ),
    );
    const plane = new three.Mesh(
      new three.PlaneGeometry(
        Math.max(size.x, size.y, size.z) * 1.35,
        Math.max(size.x, size.y, size.z) * 1.35,
      ),
      new three.MeshBasicMaterial({
        color: '#f4c95d',
        transparent: true,
        opacity: 0.24,
        side: three.DoubleSide,
      }),
    );
    if (this.axis() === 'X') {
      plane.rotation.y = Math.PI / 2;
      plane.position.x = localCut;
    } else if (this.axis() === 'Y') {
      plane.rotation.x = Math.PI / 2;
      plane.position.y = localCut;
    } else {
      plane.position.z = localCut;
    }
    group.add(plane);
    this.preview.set({
      object: group,
      extent: Math.max(size.x, size.y, size.z),
    });
  }
}
