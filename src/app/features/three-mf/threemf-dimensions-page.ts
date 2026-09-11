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
import { pollJob, PollingTimeoutError } from '../../core/api/job-polling';
import { createAndUploadThreeMfJob } from '../../core/api/three-mf-job-workflow';
import { JobCreationService } from '../../core/api/job-creation.service';
import { uploadErrorMessage } from '../../core/api/upload-error';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { FeedbackLinkComponent } from '../../core/components/feedback-link/feedback-link';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { Job, JobStatus } from '../../models/job';
import { jobFailureMessageForFormat } from '../../models/job-failure';
import {
  calculateBuildVolumeFit,
  assessPrinterOrientations,
  DimensionAxis,
  ModelDimensions,
  ModelUnit,
} from '../../shared/model-dimensions';
import { ThreeMfFilePicker } from './threemf-file-picker';
import { ModelFileFormat } from '../../core/formats/model-file-format';

type ReportRecord = Record<string, unknown>;

const MILLIMETRES_PER_3MF_UNIT: Readonly<Record<string, number>> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
};

@Component({
  selector: 'app-three-mf-dimensions-page',
  imports: [RouterLink, ThreeMfFilePicker, JobProgress, FeedbackLinkComponent],
  templateUrl: './threemf-dimensions-page.html',
  styleUrl: './threemf-dimensions-page.scss',
})
export class ThreeMfDimensionsPage {
  protected readonly routeUrl = PublicRouteUrl;
  protected readonly jobStatus = JobStatus;
  protected readonly jobFailureMessage = (failure: Job['failure']) =>
    jobFailureMessageForFormat(failure, ModelFileFormat.ThreeMf);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly job = signal<Job | null>(null);
  protected readonly submitting = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly pollingTimedOut = signal(false);
  protected readonly error = signal('');
  protected readonly buildWidth = signal<number | null>(null);
  protected readonly buildHeight = signal<number | null>(null);
  protected readonly buildDepth = signal<number | null>(null);
  protected readonly buildUnit = signal<ModelUnit>('mm');
  protected readonly buildVolumeTouched = signal(false);
  protected readonly report = computed(() => this.asRecord(this.job()?.report));
  protected readonly dimensions = computed<ModelDimensions | null>(() => {
    const values = this.asRecord(this.report()?.['dimensions']);
    const width = values?.['width'];
    const height = values?.['height'];
    const depth = values?.['depth'];
    return this.isFiniteNumber(width) &&
      this.isFiniteNumber(height) &&
      this.isFiniteNumber(depth)
      ? { width, height, depth }
      : null;
  });
  protected readonly effectiveUnit = computed(() => {
    const unit = this.report()?.['sourceUnit'];
    return typeof unit === 'string' && unit in MILLIMETRES_PER_3MF_UNIT
      ? unit
      : 'millimeter';
  });
  protected readonly convertedDimensions = computed(() => {
    const dimensions = this.dimensions();
    const factor = MILLIMETRES_PER_3MF_UNIT[this.effectiveUnit()];
    if (!dimensions || !factor) {
      return null;
    }
    const mm = this.scaleDimensions(dimensions, factor);
    return {
      mm,
      cm: this.scaleDimensions(mm, 0.1),
      in: this.scaleDimensions(mm, 1 / 25.4),
    };
  });
  protected readonly buildVolume = computed<ModelDimensions | null>(() => {
    const width = this.buildWidth();
    const height = this.buildHeight();
    const depth = this.buildDepth();
    return width !== null && height !== null && depth !== null
      ? { width, height, depth }
      : null;
  });
  protected readonly printerFit = computed(() => {
    const dimensions = this.convertedDimensions()?.mm;
    const volume = this.buildVolume();
    return dimensions && volume
      ? calculateBuildVolumeFit(dimensions, 'mm', volume, this.buildUnit())
      : null;
  });
  protected readonly buildVolumeInvalid = computed(
    () => this.buildVolumeTouched() && this.printerFit() === null,
  );
  protected readonly printerOrientations = computed(() => {
    const dimensions = this.convertedDimensions()?.mm;
    const volume = this.buildVolume();
    if (!dimensions || !volume) {
      return null;
    }
    return assessPrinterOrientations(
      dimensions,
      'mm',
      volume,
      this.buildUnit(),
    );
  });
  protected readonly processing = computed(() => {
    const status = this.job()?.status;
    return (
      !this.pollingTimedOut() &&
      (status === JobStatus.Created || status === JobStatus.Processing)
    );
  });
  private readonly picker = viewChild(ThreeMfFilePicker);
  private readonly jobs = inject(JobsService);
  private readonly jobCreation = inject(JobCreationService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private polling?: Subscription;

  constructor() {
    this.seo.apply({
      title: '3MF Dimensions Checker - Measure 3MF Files Online | InspectMesh',
      description:
        "Measure a 3MF file's final build dimensions, keep its declared unit, convert mm, cm and inches, and compare the model with your 3D printer volume.",
      path: PublicRouteUrl.ThreeMfDimensionsChecker,
    });
    this.destroyRef.onDestroy(() => this.polling?.unsubscribe());
  }

  protected onFileSelected(file: File | null): void {
    this.polling?.unsubscribe();
    this.selectedFile.set(file);
    this.job.set(null);
    this.error.set('');
    this.pollingTimedOut.set(false);
  }

  protected measure(): void {
    const file = this.selectedFile();
    if (!file || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    createAndUploadThreeMfJob(this.jobCreation, this.jobs, file, (job) =>
      this.job.set(job),
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
      },
    });
  }

  protected refresh(): void {
    const job = this.job();
    if (!job) {
      return;
    }
    this.refreshing.set(true);
    this.jobs
      .getJob(job.id)
      .pipe(finalize(() => this.refreshing.set(false)))
      .subscribe({
        next: (value) => this.job.set(value),
        error: () =>
          this.error.set('We could not refresh this job. Please try again.'),
      });
  }

  protected setBuildDimension(
    axis: 'width' | 'height' | 'depth',
    event: Event,
  ): void {
    const value = (event.target as HTMLInputElement).value.trim();
    const parsed = value === '' ? null : Number(value);
    this.buildVolumeTouched.set(true);
    if (axis === 'width') {
      this.buildWidth.set(parsed);
    } else if (axis === 'height') {
      this.buildHeight.set(parsed);
    } else {
      this.buildDepth.set(parsed);
    }
  }

  protected setBuildUnit(event: Event): void {
    this.buildUnit.set((event.target as HTMLSelectElement).value as ModelUnit);
  }

  protected orientationName(
    axisSources: Record<DimensionAxis, DimensionAxis>,
  ): string {
    const names: Record<DimensionAxis, string> = {
      width: 'width',
      height: 'height',
      depth: 'depth',
    };
    return `Place the current ${names[axisSources.width]} along the printer’s X axis, ${names[axisSources.height]} along Y and ${names[axisSources.depth]} along Z`;
  }

  protected limitingAxes(axes: readonly DimensionAxis[]): string {
    const names: Record<DimensionAxis, string> = {
      width: 'X',
      height: 'Y',
      depth: 'Z',
    };
    return axes.map((axis) => names[axis]).join(' and ');
  }

  protected formatNumber(value: unknown): string {
    return this.isFiniteNumber(value)
      ? new Intl.NumberFormat('en', { maximumFractionDigits: 3 }).format(value)
      : 'Not available';
  }

  protected formatDimensions(dimensions: ModelDimensions | null): string {
    return dimensions
      ? `${this.formatNumber(dimensions.width)} × ${this.formatNumber(dimensions.height)} × ${this.formatNumber(dimensions.depth)}`
      : 'Not available';
  }

  private poll(id: string): void {
    this.polling = pollJob(this.jobs, id).subscribe({
      next: (job) => this.job.set(job),
      error: (error: unknown) => {
        if (error instanceof PollingTimeoutError) {
          this.pollingTimedOut.set(true);
        } else {
          this.error.set(
            'Automatic status updates were interrupted. Please refresh the result.',
          );
        }
      },
    });
  }

  private scaleDimensions(
    dimensions: ModelDimensions,
    factor: number,
  ): ModelDimensions {
    return {
      width: dimensions.width * factor,
      height: dimensions.height * factor,
      depth: dimensions.depth * factor,
    };
  }

  private asRecord(value: unknown): ReportRecord | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as ReportRecord)
      : null;
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }
}
