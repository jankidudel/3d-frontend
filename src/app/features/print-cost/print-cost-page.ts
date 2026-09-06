import { DOCUMENT } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { JobCreationService } from '../../core/api/job-creation.service';
import { createAndUploadFormatJob } from '../../core/api/job-upload-workflow';
import { JobsService } from '../../core/api/jobs.service';
import { uploadErrorMessage } from '../../core/api/upload-error';
import { pollJob } from '../../core/api/job-polling';
import { JobProgress } from '../../core/components/job-progress/job-progress';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { Job, JobStatus } from '../../models/job';
import { createPdf } from '../../shared/pdf-engine';
import { ModelUnit } from '../stl-dimensions/stl-dimensions';
import { convertVolume } from '../stl-volume/stl-volume';
import { StlFilePicker } from '../stl-quality/stl-file-picker/stl-file-picker';
import { ThreeMfFilePicker } from '../three-mf/threemf-file-picker';
import {
  CostCurrency,
  CostMaterial,
  COST_CURRENCY_OPTIONS,
  DEFAULT_ELECTRICITY_PRICE_PER_KWH,
  calculatePrintCost,
  MATERIAL_DENSITIES,
} from './print-cost';

@Component({
  selector: 'app-print-cost-page',
  imports: [RouterLink, StlFilePicker, ThreeMfFilePicker, JobProgress],
  templateUrl: './print-cost-page.html',
  styleUrl: './print-cost-page.scss',
})
export class PrintCostPage {
  readonly routeUrl = PublicRouteUrl;
  readonly currencyOptions = COST_CURRENCY_OPTIONS;
  readonly jobStatus = JobStatus;
  private readonly jobs = inject(JobsService);
  private readonly creation = inject(JobCreationService);
  private readonly analytics = inject(AnalyticsService);
  private readonly document = inject(DOCUMENT);
  private polling?: Subscription;
  readonly fileFormat = signal<'stl' | '3mf'>('stl');
  readonly selectedFile = signal<File | null>(null);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly modelUnit = signal<ModelUnit>('mm');
  readonly source = signal<'slicer' | 'model'>('slicer');
  readonly material = signal<CostMaterial>('pla');
  readonly currency = signal<CostCurrency>('GBP');
  readonly customDensity = signal(1.24);
  readonly filamentWeight = signal(0);
  readonly spoolPrice = signal(20);
  readonly spoolWeight = signal(1000);
  readonly printHours = signal(0);
  readonly printerWatts = signal(120);
  readonly electricityPrice = signal<number | null>(
    DEFAULT_ELECTRICITY_PRICE_PER_KWH,
  );
  readonly machineCost = signal(0);
  readonly labourCost = signal(0);
  readonly labourHours = signal(0);
  readonly extras = signal(0);
  readonly failure = signal(0);
  readonly margin = signal(0);
  readonly report = computed(
    () => this.job()?.report as Record<string, unknown> | undefined,
  );
  readonly volumeCm3 = computed(() => {
    const v = this.report()?.['volume'];
    if (typeof v !== 'number') {
      return null;
    }
    const unit = this.report()?.['sourceUnit'];
    return typeof unit === 'string'
      ? (v *
          ({
            micron: 0.001,
            millimeter: 1,
            centimeter: 10,
            meter: 1000,
            inch: 25.4,
            foot: 304.8,
          }[unit] ?? 1) **
            3) /
          1000
      : convertVolume(v, this.modelUnit(), 'cm');
  });
  readonly density = computed(() =>
    this.material() === 'custom'
      ? this.customDensity()
      : MATERIAL_DENSITIES[this.material() as Exclude<CostMaterial, 'custom'>],
  );
  readonly modelWeight = computed(() => {
    const volume = this.volumeCm3(),
      density = this.density();
    return volume !== null && density > 0 ? volume * density : null;
  });
  readonly activeWeight = computed(() =>
    this.source() === 'model'
      ? (this.modelWeight() ?? 0)
      : this.filamentWeight(),
  );
  readonly result = computed(() =>
    calculatePrintCost({
      filamentWeightGrams: this.activeWeight(),
      spoolWeightGrams: this.spoolWeight(),
      spoolPrice: this.spoolPrice(),
      printHours: this.printHours(),
      printerWatts: this.printerWatts(),
      electricityPrice: this.electricityPrice() ?? Number.NaN,
      machineHourlyCost: this.machineCost(),
      labourHourlyCost: this.labourCost(),
      labourHours: this.labourHours(),
      extraPartsCost: this.extras(),
      failureAllowancePercent: this.failure(),
      marginPercent: this.margin(),
    }),
  );
  constructor() {
    inject(SeoService).apply({
      title:
        '3D Print Cost Calculator: Estimate Filament, Energy and Print Price | InspectMesh',
      description:
        'Estimate 3D printing cost from an STL or 3MF file, or enter slicer filament weight and print time. Include material, electricity, labour and margin.',
      path: PublicRouteUrl.PrintCostCalculator,
    });
  }
  setNumber(target: keyof PrintCostPage, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    (this[target] as unknown as { set(value: number): void }).set(value);
  }
  selectFile(file: File | null): void {
    this.selectedFile.set(file);
    this.job.set(null);
    this.error.set('');
  }
  setFormat(format: 'stl' | '3mf'): void {
    this.fileFormat.set(format);
    this.selectFile(null);
  }
  setCurrency(event: Event): void {
    const currency = (event.target as HTMLSelectElement).value as CostCurrency;
    this.currency.set(currency);
  }
  setElectricityPrice(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.electricityPrice.set(value === '' ? null : Number(value));
  }
  upload(): void {
    const file = this.selectedFile();
    if (!file || this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.analytics.trackUploadStarted('volume_calculator', file.size);
    createAndUploadFormatJob(this.creation, this.jobs, file, (job) =>
      this.job.set(job),
    ).subscribe({
      next: () => {
        this.submitting.set(false);
        this.analytics.trackUploadCompleted('volume_calculator');
        const job = this.job();
        if (job) {
          this.polling = pollJob(this.jobs, job.id).subscribe({
            next: (value) => this.job.set(value),
            error: () =>
              this.error.set(
                'Automatic status updates were interrupted. Please try again.',
              ),
          });
        }
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(uploadErrorMessage(error));
      },
    });
  }
  format(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
      return '—';
    }
    if (this.currency() === 'OTHER') {
      return new Intl.NumberFormat('en', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: this.currency(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  number(value: number | null, digits = 3): string {
    return value === null || !Number.isFinite(value)
      ? '—'
      : new Intl.NumberFormat('en', { maximumFractionDigits: digits }).format(
          value,
        );
  }
  downloadJson(): void {
    const result = this.result();
    if (!result) {
      return;
    }
    this.download(
      JSON.stringify(
        {
          calculationTimestamp: new Date().toISOString(),
          valueSource:
            this.source() === 'slicer' ? 'slicer input' : 'model estimate',
          inputs: this.inputs(),
          results: result,
        },
        null,
        2,
      ),
      '3d-print-cost-report.json',
      'application/json',
    );
    this.analytics.trackReportDownloaded('volume_calculator', 'json');
  }
  async downloadPdf(): Promise<void> {
    const result = this.result();
    if (!result) {
      return;
    }
    const pdf = await createPdf();
    pdf.text('InspectMesh 3D Print Cost Calculator', 14, 18);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
    pdf.text(
      `Values from: ${this.source() === 'slicer' ? 'slicer input' : 'solid-model estimate'}`,
      14,
      36,
    );
    let y = 48;
    Object.entries(result).forEach(([label, value]) => {
      pdf.text(
        `${label}: ${typeof value === 'number' ? this.format(value) : '—'}`,
        14,
        y,
      );
      y += 8;
    });
    pdf.save('3d-print-cost-report.pdf');
    this.analytics.trackReportDownloaded('volume_calculator', 'pdf');
  }
  private inputs(): object {
    return {
      material: this.material(),
      density: this.density(),
      currency: this.currency(),
      filamentWeightGrams: this.activeWeight(),
      printHours: this.printHours(),
      spoolPrice: this.spoolPrice(),
      spoolWeight: this.spoolWeight(),
      printerWatts: this.printerWatts(),
      electricityPrice: this.electricityPrice(),
    };
  }
  private download(text: string, name: string, type: string): void {
    const view = this.document.defaultView;
    if (!view) {
      return;
    }
    const url = view.URL.createObjectURL(new Blob([text], { type }));
    const link = this.document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    view.setTimeout(() => view.URL.revokeObjectURL(url), 0);
  }
}
