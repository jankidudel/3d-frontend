import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { JobsService } from '../../core/api/jobs.service';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import {
  createAndUploadStlJob,
  pollStlJob,
} from '../../core/api/stl-job-workflow';
import { Job } from '../../models/job';
import { jobFailureMessage } from '../../models/job-failure';
import { StlFilePicker } from '../stl-quality/stl-file-picker/stl-file-picker';
import {
  calculateBuildVolumeFit,
  calculateScale,
  convertLength,
  DimensionAxis,
  ModelDimensions,
  ModelUnit,
} from './stl-dimensions';

type ReportRecord = Record<string, unknown>;

@Component({
  selector: 'app-stl-dimensions-page',
  imports: [RouterLink, StlFilePicker],
  templateUrl: './stl-dimensions-page.html',
  styleUrl: './stl-dimensions-page.scss',
})
export class StlDimensionsPage {
  readonly jobFailureMessage = jobFailureMessage;
  private readonly jobsService = inject(JobsService);
  private readonly analytics = inject(AnalyticsService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private polling?: Subscription;
  private uploadStartedTracked = false;
  private uploadCompletedTracked = false;
  private outcomeTracked = false;
  private scaleTracked = false;
  private printerFitTracked = false;

  readonly selectedFile = signal<File | null>(null);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);
  readonly refreshing = signal(false);
  readonly error = signal('');
  readonly modelUnit = signal<ModelUnit>('mm');
  readonly desiredUnit = signal<ModelUnit>('mm');
  readonly targetAxis = signal<DimensionAxis>('width');
  readonly desiredSize = signal<number | null>(null);
  readonly desiredSizeTouched = signal(false);
  readonly buildWidth = signal<number | null>(null);
  readonly buildHeight = signal<number | null>(null);
  readonly buildDepth = signal<number | null>(null);
  readonly buildUnit = signal<ModelUnit>('mm');
  readonly buildVolumeTouched = signal(false);

  readonly processing = computed(() => {
    const status = this.job()?.status;
    return status === 'created' || status === 'processing';
  });
  readonly report = computed(() => this.asRecord(this.job()?.report));
  readonly rawDimensions = computed(() => {
    const dimensions = this.asRecord(this.report()?.['dimensions']);
    const width = dimensions?.['width'];
    const height = dimensions?.['height'];
    const depth = dimensions?.['depth'];
    return typeof width === 'number' &&
      Number.isFinite(width) &&
      typeof height === 'number' &&
      Number.isFinite(height) &&
      typeof depth === 'number' &&
      Number.isFinite(depth)
      ? { width, height, depth }
      : null;
  });
  readonly convertedDimensions = computed(() => {
    const dimensions = this.rawDimensions();
    if (!dimensions) {
      return null;
    }
    return {
      mm: this.convertDimensions(dimensions, this.modelUnit(), 'mm'),
      cm: this.convertDimensions(dimensions, this.modelUnit(), 'cm'),
      in: this.convertDimensions(dimensions, this.modelUnit(), 'in'),
    };
  });
  readonly scaleResult = computed(() => {
    const dimensions = this.rawDimensions();
    const desiredSize = this.desiredSize();
    return dimensions && desiredSize !== null
      ? calculateScale(
          dimensions,
          this.modelUnit(),
          this.targetAxis(),
          desiredSize,
          this.desiredUnit(),
        )
      : null;
  });
  readonly desiredSizeInvalid = computed(
    () =>
      this.desiredSizeTouched() &&
      (this.desiredSize() === null || this.scaleResult() === null),
  );
  readonly buildVolume = computed<ModelDimensions | null>(() => {
    const width = this.buildWidth();
    const height = this.buildHeight();
    const depth = this.buildDepth();
    return width !== null && height !== null && depth !== null
      ? { width, height, depth }
      : null;
  });
  readonly buildVolumeFit = computed(() => {
    const dimensions = this.rawDimensions();
    const buildVolume = this.buildVolume();
    return dimensions && buildVolume
      ? calculateBuildVolumeFit(
          dimensions,
          this.modelUnit(),
          buildVolume,
          this.buildUnit(),
        )
      : null;
  });
  readonly buildVolumeInvalid = computed(
    () => this.buildVolumeTouched() && this.buildVolumeFit() === null,
  );
  readonly validationIsValid = computed(() => {
    const validation = this.asRecord(this.report()?.['validation']);
    return validation?.['isValid'] === true;
  });
  readonly boundingBox = computed(() =>
    this.asRecord(this.report()?.['boundingBox']),
  );

  constructor() {
    this.seo.apply({
      title: 'STL Dimensions Checker - Measure, Convert and Scale STL Files',
      description:
        'Measure STL width, height and depth, convert model units, calculate proportional scaling, and check whether a model fits a printer build volume.',
      path: '/stl-dimensions-checker',
    });
    this.destroyRef.onDestroy(() => this.polling?.unsubscribe());
  }

  onFileSelected(file: File | null): void {
    this.polling?.unsubscribe();
    this.selectedFile.set(file);
    this.job.set(null);
    this.error.set('');
    this.desiredSize.set(null);
    this.desiredSizeTouched.set(false);
    this.uploadStartedTracked = false;
    this.uploadCompletedTracked = false;
    this.outcomeTracked = false;
    this.scaleTracked = false;
    this.printerFitTracked = false;
  }

  measureStl(): void {
    const file = this.selectedFile();
    if (!file) {
      this.error.set('Choose a valid STL file before measuring it.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    if (!this.uploadStartedTracked) {
      this.analytics.trackUploadStarted('dimensions_checker', file.size);
      this.uploadStartedTracked = true;
    }
    createAndUploadStlJob(this.jobsService, file, (job) => this.job.set(job))
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          if (!this.uploadCompletedTracked) {
            this.analytics.trackUploadCompleted('dimensions_checker');
            this.uploadCompletedTracked = true;
          }
          const createdJob = this.job();
          if (createdJob) {
            this.startPolling(createdJob.id);
          }
        },
        error: () =>
          this.error.set(
            'We could not create the job or upload the file. Please try again.',
          ),
      });
  }

  refreshStatus(): void {
    const currentJob = this.job();
    if (!currentJob) {
      return;
    }
    this.refreshing.set(true);
    this.error.set('');
    this.jobsService
      .getJob(currentJob.id)
      .pipe(finalize(() => this.refreshing.set(false)))
      .subscribe({
        next: (job) => this.updateJob(job),
        error: () =>
          this.error.set('We could not refresh this job. Please try again.'),
      });
  }

  setModelUnit(event: Event): void {
    this.modelUnit.set((event.target as HTMLSelectElement).value as ModelUnit);
  }

  setDesiredUnit(event: Event): void {
    this.desiredUnit.set(
      (event.target as HTMLSelectElement).value as ModelUnit,
    );
  }

  setTargetAxis(event: Event): void {
    this.targetAxis.set(
      (event.target as HTMLSelectElement).value as DimensionAxis,
    );
  }

  setDesiredSize(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    this.desiredSizeTouched.set(true);
    this.desiredSize.set(value === '' ? null : Number(value));
  }

  setBuildDimension(axis: DimensionAxis, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    this.buildVolumeTouched.set(true);
    const parsedValue = value === '' ? null : Number(value);
    if (axis === 'width') {
      this.buildWidth.set(parsedValue);
    } else if (axis === 'height') {
      this.buildHeight.set(parsedValue);
    } else {
      this.buildDepth.set(parsedValue);
    }
  }

  setBuildUnit(event: Event): void {
    this.buildUnit.set((event.target as HTMLSelectElement).value as ModelUnit);
  }

  trackScaleCalculation(): void {
    if (!this.scaleTracked && this.scaleResult()) {
      this.analytics.trackScaleCalculated(this.targetAxis());
      this.scaleTracked = true;
    }
  }

  trackPrinterFitCheck(): void {
    const result = this.buildVolumeFit();
    if (!this.printerFitTracked && result) {
      this.analytics.trackPrinterFitChecked(result.fits);
      this.printerFitTracked = true;
    }
  }

  formatNumber(value: unknown, maximumFractionDigits = 3): string {
    return typeof value === 'number' && Number.isFinite(value)
      ? new Intl.NumberFormat('en', {
          maximumFractionDigits,
          useGrouping: true,
        }).format(value)
      : '—';
  }

  formatDimensions(dimensions: ModelDimensions | null): string {
    return dimensions
      ? `${this.formatNumber(dimensions.width)} × ${this.formatNumber(dimensions.height)} × ${this.formatNumber(dimensions.depth)}`
      : '— × — × —';
  }

  private startPolling(jobId: string): void {
    this.polling?.unsubscribe();
    this.polling = pollStlJob(this.jobsService, jobId).subscribe({
      next: (job) => this.updateJob(job),
      error: () =>
        this.error.set(
          'Automatic status updates were interrupted. Use Check again below, or upload the file again.',
        ),
    });
  }

  private updateJob(job: Job): void {
    this.job.set(job);
    if (this.outcomeTracked) {
      return;
    }
    if (job.status === 'completed') {
      this.analytics.trackAnalysisCompleted('dimensions_checker', job.report);
      this.outcomeTracked = true;
    } else if (job.status === 'failed') {
      this.analytics.trackAnalysisFailed('dimensions_checker', job.failure);
      this.outcomeTracked = true;
    }
  }

  private convertDimensions(
    dimensions: ModelDimensions,
    from: ModelUnit,
    to: ModelUnit,
  ): ModelDimensions {
    return {
      width: convertLength(dimensions.width, from, to),
      height: convertLength(dimensions.height, from, to),
      depth: convertLength(dimensions.depth, from, to),
    };
  }

  private asRecord(value: unknown): ReportRecord | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as ReportRecord)
      : null;
  }
}
