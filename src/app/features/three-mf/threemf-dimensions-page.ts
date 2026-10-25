import { GuideRouteUrl } from '../../core/seo/guide-routes';
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
import { PrinterProfileService } from '../../core/printer/printer-profile.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { Job, JobStatus } from '../../models/job';
import { jobFailureMessageForFormat } from '../../models/job-failure';
import {
  calculateBuildVolumeFit,
  assessPrinterOrientations,
  DimensionAxis,
  ModelDimensions,
} from '../../shared/model-dimensions';
import { ThreeMfFilePicker } from './threemf-file-picker';
import { ModelFileFormat } from '../../core/formats/model-file-format';
import { PrinterFitControls } from '../../shared/printer-fit-controls';

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
  readonly guideRouteUrl = GuideRouteUrl;
  private readonly printerProfile = inject(PrinterProfileService);
  private readonly printerFitControls = new PrinterFitControls(
    this.printerProfile,
  );
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
  protected readonly buildWidth = this.printerFitControls.buildWidth;
  protected readonly buildHeight = this.printerFitControls.buildHeight;
  protected readonly buildDepth = this.printerFitControls.buildDepth;
  protected readonly buildUnit = this.printerFitControls.buildUnit;
  protected readonly buildVolumeTouched =
    this.printerFitControls.buildVolumeTouched;
  protected readonly hasSavedPrinterProfile = computed(
    () => this.printerProfile.profile() !== null,
  );
  protected readonly printerPresets = this.printerFitControls.presets;
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
      title: '3MF Dimensions Checker: Units and Build Bounds | InspectMesh',
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
    this.printerFitControls.setDimension(axis, event);
  }

  protected setBuildUnit(event: Event): void {
    this.printerFitControls.setUnit(event);
  }

  protected applyPrinterPreset(event: Event): void {
    this.printerFitControls.applyPreset(event);
  }

  protected clearSavedPrinterProfile(): void {
    this.printerFitControls.clear();
  }

  protected orientationName(
    axisSources: Record<DimensionAxis, DimensionAxis>,
  ): string {
    return this.printerFitControls.orientationName(axisSources);
  }

  protected limitingAxes(axes: readonly DimensionAxis[]): string {
    return this.printerFitControls.limitingAxes(axes);
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
