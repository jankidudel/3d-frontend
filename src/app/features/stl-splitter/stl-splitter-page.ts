import { GuideRouteUrl } from '../../core/seo/guide-routes';
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
import { ExampleLoader } from '../examples/example-loader';
import {
  getMaxFileUploadSizeLimit,
  getMaxFileUploadSizeLimitMiB,
} from '../../core/api/upload-limits';

const Axis = { X: 'X', Y: 'Y', Z: 'Z' } as const;
type Axis = (typeof Axis)[keyof typeof Axis];
type Bounds = Record<Axis, { min: number; max: number }>;
interface SplitPartReport {
  readonly fileName: string;
  readonly triangleCount: number;
  readonly dimensions: {
    readonly width: number;
    readonly height: number;
    readonly depth: number;
  };
  readonly boundingBox: {
    readonly minX: number;
    readonly minY: number;
    readonly minZ: number;
    readonly maxX: number;
    readonly maxY: number;
    readonly maxZ: number;
  };
  readonly validation: {
    readonly isValid: boolean;
    readonly isWatertight: boolean;
    readonly isManifold: boolean;
    readonly connectedComponentCount: number;
  };
}
interface StlSplitReport {
  readonly split: {
    readonly axis: Axis;
    readonly positionPercent: number;
    readonly positionCoordinate: number;
    readonly partA: SplitPartReport;
    readonly partB: SplitPartReport;
  };
}

export const SplitFailureCode = {
  GeometryRejected: 'split_could_not_be_capped_safely',
  ProcessingFailed: 'processing_failed',
} as const;

export function splitFailureMessage(job: Job): string {
  const failure = job.failure?.error;
  if (failure?.message) {
    return failure.message;
  }
  if (failure?.code === SplitFailureCode.GeometryRejected) {
    return 'The selected cut could not be capped safely.';
  }
  if (failure?.code === SplitFailureCode.ProcessingFailed) {
    return 'The processing job failed. Retry once with the same settings; if it repeats, keep the file and settings for support.';
  }
  return 'The split did not complete. Keep the selected file and cut settings, then review the failure stage before retrying.';
}
@Component({
  selector: 'app-stl-splitter-page',
  imports: [
    RouterLink,
    StlFilePicker,
    JobProgress,
    ObjectViewerComponent,
    ExampleLoader,
  ],
  templateUrl: './stl-splitter-page.html',
  styleUrl: './stl-splitter-page.scss',
})
export class StlSplitterPage {
  readonly guideRouteUrl = GuideRouteUrl;
  readonly routeUrl = PublicRouteUrl;
  readonly fileLimitMiB = getMaxFileUploadSizeLimitMiB();
  readonly jobStatus = JobStatus;
  readonly file = signal<File | null>(null);
  readonly axis = signal<Axis>(Axis.Z);
  readonly position = signal(50);
  readonly bounds = signal<Bounds | null>(null);
  readonly preview = signal<{
    object: import('three').Object3D;
    extent: number;
  } | null>(null);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);
  readonly reading = signal(false);
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
  readonly failureMessage = computed(() => {
    const job = this.job();
    return job ? splitFailureMessage(job) : '';
  });
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
      !this.submitting() &&
      !this.processing(),
  );
  private readonly jobs = inject(JobsService);
  private readonly stlJobs = inject(StlJobService);
  private readonly analytics = inject(AnalyticsService);
  private readonly pdf = inject(MeshQualityPdfService);
  private readonly document = inject(DOCUMENT);
  private readonly picker = viewChild(StlFilePicker);
  private readonly destroyRef = inject(DestroyRef);
  private polling?: Subscription;
  private submission?: Subscription;
  private operationRevision = 0;
  private previewRevision = 0;
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
        'Cut a supported STL along an X, Y or Z plane, download both capped exports and inspect their dimensions before slicing.',
      path: PublicRouteUrl.StlSplitter,
    });
    this.destroyRef.onDestroy(() => {
      this.polling?.unsubscribe();
      this.submission?.unsubscribe();
    });
  }
  onFileSelected(file: File | null): void {
    void this.selectFile(file);
  }
  readonly loadExample = async (files: readonly File[]): Promise<void> => {
    const file = files[0];
    if (!file) {
      throw new Error('The example did not include an STL file.');
    }
    await this.selectFile(file);
  };
  private async selectFile(file: File | null): Promise<void> {
    this.invalidateResult();
    const previewRevision = ++this.previewRevision;
    this.file.set(file);
    this.bounds.set(null);
    this.preview.set(null);
    this.previewFactory = null;
    this.error.set('');
    this.reading.set(false);
    if (file) {
      if (!file.size || file.size > getMaxFileUploadSizeLimit()) {
        this.error.set(
          `Choose a non-empty STL no larger than ${this.fileLimitMiB} MiB.`,
        );
        return;
      }
      this.reading.set(true);
      this.analytics.trackSplitter(
        AnalyticsEvent.SplitterUploadStarted,
        file.size,
      );
      await this.loadPreview(file, previewRevision);
      if (previewRevision === this.previewRevision) {
        this.reading.set(false);
      }
    }
  }
  setAxis(value: Axis): void {
    if (value === this.axis()) {
      return;
    }
    this.invalidateResult();
    this.axis.set(value);
    this.updatePreview();
  }
  setPosition(value: number): void {
    const next = Math.max(0, Math.min(100, value));
    if (next === this.position()) {
      return;
    }
    this.invalidateResult();
    this.position.set(next);
    this.updatePreview();
  }
  split(): void {
    const file = this.file();
    if (!file || !this.canSplit()) {
      return;
    }
    this.polling?.unsubscribe();
    this.submission?.unsubscribe();
    const revision = ++this.operationRevision;
    this.job.set(null);
    this.timedOut.set(false);
    this.submitting.set(true);
    this.error.set('');
    this.analytics.trackSplitter(AnalyticsEvent.SplitterSplitStarted);
    this.submission = createAndUploadStlSplitJob(
      this.stlJobs,
      this.jobs,
      file,
      this.axis(),
      this.position(),
      (job) => {
        if (revision === this.operationRevision) {
          this.job.set(job);
        }
      },
    ).subscribe({
      next: () => {
        if (revision !== this.operationRevision) {
          return;
        }
        this.submitting.set(false);
        const job = this.job();
        if (job) {
          this.poll(job.id, revision);
        }
      },
      error: (error: unknown) => {
        if (revision !== this.operationRevision) {
          return;
        }
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
    const revision = this.operationRevision;
    this.refreshing.set(true);
    this.jobs
      .getJob(job.id)
      .pipe(
        finalize(() => {
          if (revision === this.operationRevision) {
            this.refreshing.set(false);
          }
        }),
      )
      .subscribe({
        next: (value) => {
          if (revision !== this.operationRevision || value.id !== job.id) {
            return;
          }
          this.job.set(value);
          if (
            value.status === JobStatus.Completed ||
            value.status === JobStatus.Failed
          ) {
            this.timedOut.set(false);
            this.error.set('');
          }
          this.trackCompletion(value);
        },
        error: () => {
          if (revision === this.operationRevision) {
            this.error.set(
              'We could not refresh this split job. Please try again.',
            );
          }
        },
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
  partLabel(part: SplitPartReport, result: StlSplitReport['split']): string {
    return part === result.partA
      ? `Lower ${result.axis} export`
      : `Upper ${result.axis} export`;
  }
  boundsLabel(part: SplitPartReport): string {
    const bounds = part.boundingBox;
    return bounds
      ? `X ${this.format(bounds.minX)}..${this.format(bounds.maxX)}, Y ${this.format(bounds.minY)}..${this.format(bounds.maxY)}, Z ${this.format(bounds.minZ)}..${this.format(bounds.maxZ)}`
      : 'Bounds not available';
  }
  private poll(id: string, revision: number): void {
    this.polling = pollStlJob(this.jobs, id).subscribe({
      next: (job) => {
        if (revision !== this.operationRevision || job.id !== id) {
          return;
        }
        this.job.set(job);
        this.trackCompletion(job);
      },
      error: (error) => {
        if (revision !== this.operationRevision) {
          return;
        }
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
  private async loadPreview(file: File, revision: number): Promise<void> {
    try {
      const [{ STLLoader }, three] = await Promise.all([
        import('three/examples/jsm/loaders/STLLoader.js'),
        import('three'),
      ]);
      const geometry = new STLLoader().parse(await file.arrayBuffer());
      geometry.computeBoundingBox();
      const box = geometry.boundingBox?.clone();
      if (
        !box ||
        geometry.getAttribute('position').count === 0 ||
        ![...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)
      ) {
        throw new Error('Missing bounds');
      }
      if (revision !== this.previewRevision || file !== this.file()) {
        return;
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
      if (revision === this.previewRevision && file === this.file()) {
        this.error.set(
          'We could not read that STL file. Choose a valid ASCII or binary STL file.',
        );
      }
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
  private invalidateResult(): void {
    this.operationRevision += 1;
    this.polling?.unsubscribe();
    this.submission?.unsubscribe();
    this.job.set(null);
    this.submitting.set(false);
    this.refreshing.set(false);
    this.timedOut.set(false);
    this.reportDownloadError.set('');
    this.error.set('');
  }
}
