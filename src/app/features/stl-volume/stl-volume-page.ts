import { ExampleAsset } from '../examples/example-assets';
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
import { StlJobService } from '../../core/api/stl-job.service';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { FeedbackLinkComponent } from '../../core/components/feedback-link/feedback-link';
import { uploadErrorMessage } from '../../core/api/upload-error';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import {
  createAndUploadStlJob,
  PollingTimeoutError,
  pollStlJob,
} from '../../core/api/stl-job-workflow';
import { Job, JobStatus } from '../../models/job';
import { jobFailureMessage } from '../../models/job-failure';
import { ModelUnit } from '../stl-dimensions/stl-dimensions';
import { StlFilePicker } from '../stl-quality/stl-file-picker/stl-file-picker';
import {
  calculateMaterialEstimate,
  convertVolume,
  MATERIAL_OPTIONS,
  Material,
} from './stl-volume';

type ReportRecord = Record<string, unknown>;

@Component({
  selector: 'app-stl-volume-page',
  imports: [RouterLink, StlFilePicker, JobProgress, FeedbackLinkComponent],
  templateUrl: './stl-volume-page.html',
  styleUrl: './stl-volume-page.scss',
})
export class StlVolumePage {
  readonly exampleAsset = ExampleAsset;
  readonly routeUrl = PublicRouteUrl;
  readonly jobFailureMessage = jobFailureMessage;
  readonly jobStatus = JobStatus;
  private readonly jobsService = inject(JobsService);
  private readonly stlJobs = inject(StlJobService);
  private readonly analytics = inject(AnalyticsService);
  private readonly seo = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private polling?: Subscription;
  private uploadStartedTracked = false;
  private uploadCompletedTracked = false;
  private outcomeTracked = false;
  private readonly trackedMaterials = new Set<Material>();

  readonly selectedFile = signal<File | null>(null);
  private readonly filePicker = viewChild(StlFilePicker);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);
  readonly pollingTimedOut = signal(false);
  readonly refreshing = signal(false);
  readonly error = signal('');
  readonly modelUnit = signal<ModelUnit>('mm');
  readonly material = signal<Material>('pla');
  readonly customDensity = signal<number | null>(null);
  readonly customDensityTouched = signal(false);
  readonly infillPercentage = signal(15);
  readonly infillTouched = signal(false);

  readonly processing = computed(() => {
    const status = this.job()?.status;
    return (
      !this.pollingTimedOut() &&
      (status === JobStatus.Created || status === JobStatus.Processing)
    );
  });
  readonly report = computed(() => this.asRecord(this.job()?.report));
  readonly rawVolume = computed(() => {
    const volume = this.report()?.['volume'];
    return typeof volume === 'number' && Number.isFinite(volume) && volume >= 0
      ? volume
      : null;
  });
  readonly volumeInCubicCentimetres = computed(() => {
    const volume = this.rawVolume();
    return volume === null
      ? null
      : convertVolume(volume, this.modelUnit(), 'cm');
  });
  readonly convertedVolumes = computed(() => {
    const volume = this.rawVolume();
    if (volume === null) {
      return null;
    }
    return {
      mm: convertVolume(volume, this.modelUnit(), 'mm'),
      cm: convertVolume(volume, this.modelUnit(), 'cm'),
      in: convertVolume(volume, this.modelUnit(), 'in'),
    };
  });
  readonly validationIsValid = computed(() => {
    const validation = this.asRecord(this.report()?.['validation']);
    return validation?.['isValid'] === true;
  });
  readonly density = computed(() => {
    const material = this.material();
    return material === 'custom'
      ? this.customDensity()
      : MATERIAL_OPTIONS[material].density;
  });
  readonly estimate = computed(() => {
    const volume = this.volumeInCubicCentimetres();
    const density = this.density();
    return volume !== null && density !== null
      ? calculateMaterialEstimate(volume, density, this.infillPercentage())
      : null;
  });
  readonly customDensityInvalid = computed(
    () =>
      this.material() === 'custom' &&
      this.customDensityTouched() &&
      (this.customDensity() === null ||
        !Number.isFinite(this.customDensity() ?? Number.NaN) ||
        (this.customDensity() ?? 0) <= 0),
  );
  readonly infillInvalid = computed(
    () =>
      this.infillTouched() &&
      (!Number.isFinite(this.infillPercentage()) ||
        this.infillPercentage() < 0 ||
        this.infillPercentage() > 100),
  );
  readonly boundingBox = computed(() =>
    this.asRecord(this.report()?.['boundingBox']),
  );

  constructor() {
    this.seo.apply({
      title: 'STL Volume Calculator - Calculate STL Volume and Material Weight',
      description:
        'Calculate an STL model’s volume, convert cubic units, and estimate approximate material weight for common 3D printing materials.',
      path: PublicRouteUrl.VolumeCalculator,
    });
    this.destroyRef.onDestroy(() => this.polling?.unsubscribe());
  }

  onFileSelected(file: File | null): void {
    this.polling?.unsubscribe();
    this.selectedFile.set(file);
    this.job.set(null);
    this.error.set('');
    this.pollingTimedOut.set(false);
    this.uploadStartedTracked = false;
    this.uploadCompletedTracked = false;
    this.outcomeTracked = false;
    this.trackedMaterials.clear();
  }

  calculateVolume(): void {
    if (this.submitting()) {
      return;
    }
    const file = this.selectedFile();
    if (!file) {
      this.error.set('Choose a valid STL file before calculating its volume.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    if (!this.uploadStartedTracked) {
      this.analytics.trackUploadStarted('volume_calculator', file.size);
      this.uploadStartedTracked = true;
    }
    createAndUploadStlJob(this.stlJobs, this.jobsService, file, (job) =>
      this.job.set(job),
    ).subscribe({
      next: () => {
        this.submitting.set(false);
        if (!this.uploadCompletedTracked) {
          this.analytics.trackUploadCompleted('volume_calculator');
          this.uploadCompletedTracked = true;
        }
        const createdJob = this.job();
        if (createdJob) {
          this.startPolling(createdJob.id);
        }
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(uploadErrorMessage(error));
      },
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

  setMaterial(event: Event): void {
    this.material.set((event.target as HTMLSelectElement).value as Material);
  }

  setCustomDensity(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.customDensityTouched.set(true);
    this.customDensity.set(value === '' ? null : Number(value));
  }

  setInfillPercentage(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.infillTouched.set(true);
    this.infillPercentage.set(value === '' ? Number.NaN : Number(value));
  }

  trackMaterialEstimate(): void {
    const material = this.material();
    if (!this.trackedMaterials.has(material) && this.estimate()) {
      this.analytics.trackMaterialEstimateUsed(material);
      this.trackedMaterials.add(material);
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

  formatMass(grams: number): string {
    return grams >= 1000
      ? this.formatNumber(grams / 1000, 3) + ' kg'
      : this.formatNumber(grams, 2) + ' g';
  }

  private startPolling(jobId: string): void {
    this.polling?.unsubscribe();
    this.polling = pollStlJob(this.jobsService, jobId).subscribe({
      next: (job) => this.updateJob(job),
      error: (error: unknown) => this.handlePollingError(error),
    });
  }

  private updateJob(job: Job): void {
    this.job.set(job);
    if (job.status === JobStatus.Completed || job.status === JobStatus.Failed) {
      this.pollingTimedOut.set(false);
    }
    if (this.outcomeTracked) {
      return;
    }
    if (job.status === JobStatus.Completed) {
      this.analytics.trackAnalysisCompleted('volume_calculator', job.report);
      this.outcomeTracked = true;
    } else if (job.status === JobStatus.Failed) {
      this.analytics.trackAnalysisFailed('volume_calculator', job.failure);
      this.outcomeTracked = true;
    }
  }

  private handlePollingError(error: unknown): void {
    if (error instanceof PollingTimeoutError) {
      this.pollingTimedOut.set(true);
      this.error.set(
        'This calculation is taking longer than expected. Use Check again below to see whether it has finished.',
      );
      return;
    }
    this.error.set(
      'Automatic status updates were interrupted. Use Check again below, or upload the file again.',
    );
  }

  private asRecord(value: unknown): ReportRecord | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as ReportRecord)
      : null;
  }
}
