import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { ExampleLoader } from '../examples/example-loader';
import { createPdf } from '../../shared/pdf-engine';
import {
  JobPlanningSession,
  PlanningDestination,
} from '../planning/job-planning-session';
import { Router, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PrinterProfileService } from '../../core/printer/printer-profile.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { GuideSlug } from '../guides/generated/guide-slug.generated';
import { SeoService } from '../../core/seo/seo.service';
import {
  coordinateMessage,
  GCODE_REPORT_VERSION,
  GcodeCoverage,
  GcodeEvidence,
  dimensions,
  GcodeLayer,
  GcodeReport,
  layerMoveCounts,
} from './gcode-parser';

@Component({
  selector: 'app-gcode-preflight-page',
  imports: [ToolEvidenceComponent, RouterLink, ExampleLoader],
  templateUrl: './gcode-preflight-page.html',
  styleUrl: './gcode-preflight-page.scss',
})
export class GcodePreflightPage implements OnDestroy {
  private readonly router = inject(Router);
  private readonly planning = inject(JobPlanningSession);
  readonly NaNValue = NaN;
  readonly destinations = PlanningDestination;
  readonly evidence = signal<GcodeEvidence | null>(null);
  readonly exportText = signal('');
  readonly message = signal('');
  readonly reviewed = signal(false);
  readonly reviewedHours = signal<number | null>(null);
  readonly reviewedGrams = signal<number | null>(null);
  readonly minX = signal(0);
  readonly minY = signal(0);
  readonly minZ = signal(0);
  readonly hash = signal<string | null>(null);
  private request = 0;
  private exampleRequest = 0;
  private worker: Worker | null = null;
  private rejectWorker: ((error: Error) => void) | null = null;
  readonly loadExample = async (files: readonly File[]) =>
    this.loadFile(files[0]);
  readonly guideRouteUrl = GuideRouteUrl;
  readonly routeUrl = PublicRouteUrl;
  readonly guideSlug = GuideSlug;
  readonly file = signal<File | null>(null);
  readonly report = signal<GcodeReport | null>(null);
  readonly error = signal('');
  readonly parsing = signal(false);
  readonly selectedLayer = signal(0);
  readonly showTravel = signal(true);
  readonly previewUsed = signal(false);
  readonly volumeUsed = signal(false);
  readonly buildX = signal<number | null>(null);
  readonly buildY = signal<number | null>(null);
  readonly buildZ = signal<number | null>(null);
  readonly zoom = signal(1);
  readonly maximumHotend = signal<number | null>(null);
  readonly maximumBed = signal<number | null>(null);
  private readonly printers = inject(PrinterProfileService);
  readonly printerProfile = computed(() => this.printers.profile());
  readonly selected = computed<GcodeLayer | null>(
    () => this.report()?.layers[this.selectedLayer()] ?? null,
  );
  readonly selectedLayerMoves = computed(() => {
    const layer = this.selected();
    if (!layer) {
      return { extrusion: 0, travel: 0 };
    }
    return layerMoveCounts(layer);
  });
  readonly size = computed(() =>
    this.report()?.extents ? dimensions(this.report()!.extents!) : null,
  );
  readonly volumeMessage = computed(() => {
    const report = this.report();
    const x = this.buildX();
    const y = this.buildY();
    const z = this.buildZ();
    return report && x !== null && y !== null && z !== null
      ? coordinateMessage(
          report.extents,
          {
            min: { x: this.minX(), y: this.minY(), z: this.minZ() },
            max: { x, y, z },
          },
          report.coverage.linear,
        )
      : null;
  });
  readonly extrusionMessage = computed(() => {
    const report = this.report();
    const x = this.buildX();
    const y = this.buildY();
    const z = this.buildZ();
    return report && x !== null && y !== null && z !== null
      ? coordinateMessage(
          report.extrusionExtents,
          {
            min: { x: this.minX(), y: this.minY(), z: this.minZ() },
            max: { x, y, z },
          },
          report.coverage.extrusion,
        )
      : null;
  });
  readonly temperatureLimitMessage = computed(() => {
    const report = this.report();
    if (!report) {
      return null;
    }
    const hotend = this.maximumHotend();
    const bed = this.maximumBed();
    const hotendMax = Math.max(
      ...report.hotendTargets.map((target) => target.value),
      -Infinity,
    );
    const bedMax = Math.max(
      ...report.bedTargets.map((target) => target.value),
      -Infinity,
    );
    const notices = [];
    if (hotend !== null && hotendMax > hotend) {
      notices.push(`hotend target reaches ${hotendMax}°C (limit ${hotend}°C)`);
    }
    if (bed !== null && bedMax > bed) {
      notices.push(`bed target reaches ${bedMax}°C (limit ${bed}°C)`);
    }
    return notices.length
      ? `Review: ${notices.join('; ')}.`
      : hotend !== null || bed !== null
        ? 'Parsed targets are within the limits you entered.'
        : null;
  });
  private readonly analytics = inject(AnalyticsService);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: 'Free G-code Viewer & Preflight Checker | InspectMesh',
      description:
        'Open a sliced G-code file locally to inspect parsed layers, toolpaths, metadata and practical preflight details before printing.',
      path: PublicRouteUrl.GcodePreflightChecker,
    });
  }

  openPicker(input: HTMLInputElement): void {
    input.click();
  }
  async pick(event: Event): Promise<void> {
    await this.loadFile((event.target as HTMLInputElement).files?.item(0));
  }
  async runSlicerExample(classic = false): Promise<void> {
    const request = this.request;
    const exampleRequest = ++this.exampleRequest;
    try {
      const { ownedDemoFile, DemoAsset } =
        await import('../repeat-workflows/demo-file');
      const file = await ownedDemoFile(
        classic ? DemoAsset.Classic : DemoAsset.Arachne,
      );
      if (request !== this.request || exampleRequest !== this.exampleRequest) {
        return;
      }
      await this.loadFile(file);
    } catch (error: unknown) {
      if (request !== this.request || exampleRequest !== this.exampleRequest) {
        return;
      }
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The example could not be loaded.',
      );
    }
  }
  async loadFile(file: File | null | undefined): Promise<void> {
    this.reset();
    const request = this.request;
    if (!file) {
      return;
    }
    if (
      !/\.(gcode|gco|gc)$/i.test(file.name) ||
      file.size === 0 ||
      file.size > getMaxFileUploadSizeLimit()
    ) {
      this.error.set(
        'Choose a non-empty .gcode, .gco or .gc file up to 25 MiB.',
      );
      return;
    }
    this.file.set(file);
    this.parsing.set(true);
    this.analytics.trackGcodeUploadStarted(file.size);
    try {
      // Parsing runs in a dedicated browser worker; no file data leaves this page.
      const bytes = await file.arrayBuffer();
      if (request !== this.request) {
        return;
      }
      const parsed = await this.parseInWorker(
        new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      );
      if (request !== this.request) {
        return;
      }
      this.reviewedHours.set(parsed.duration?.value ?? null);
      this.reviewedGrams.set(parsed.material?.value ?? null);
      if (globalThis.crypto?.subtle) {
        void crypto.subtle
          .digest('SHA-256', bytes)
          .then((digest) => {
            if (request === this.request) {
              this.hash.set(
                [...new Uint8Array(digest)]
                  .map((byte) => byte.toString(16).padStart(2, '0'))
                  .join(''),
              );
            }
          })
          .catch(() => {});
      }
      this.report.set(parsed);
      this.selectedLayer.set(0);
      this.analytics.trackGcodeParsed();
      if (parsed.limitations.length) {
        this.analytics.trackGcodeLimitationShown();
      }
    } catch (error) {
      if (request !== this.request) {
        return;
      }
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Could not parse this G-code safely.',
      );
    } finally {
      if (request === this.request) {
        this.parsing.set(false);
      }
    }
  }
  setLayer(index: number): void {
    const layers = this.report()?.layers.length ?? 0;
    if (!layers) {
      return;
    }
    this.selectedLayer.set(Math.min(Math.max(index, 0), layers - 1));
    if (!this.previewUsed()) {
      this.previewUsed.set(true);
      this.analytics.trackGcodeLayerPreviewUsed();
    }
  }
  previousLayer(): void {
    this.setLayer(this.selectedLayer() - 1);
  }
  nextLayer(): void {
    this.setLayer(this.selectedLayer() + 1);
  }
  setTravel(value: boolean): void {
    this.showTravel.set(value);
    this.setLayer(this.selectedLayer());
  }
  compareVolume(): void {
    if (!this.volumeUsed() && this.volumeMessage()) {
      this.volumeUsed.set(true);
      this.analytics.trackGcodeBuildVolumeUsed();
    }
  }
  previewPath(path: {
    from: { x: number; y: number };
    to: { x: number; y: number };
  }): string {
    const bounds = this.report()?.extents;
    if (!bounds) {
      return '';
    }
    const minX = bounds.min.x;
    const maxX = bounds.max.x;
    const minY = bounds.min.y;
    const maxY = bounds.max.y;
    const width = 1000;
    const height = 600;
    const padding = 48;
    const scale =
      Math.min(
        (width - padding * 2) / Math.max(maxX - minX, 1),
        (height - padding * 2) / Math.max(maxY - minY, 1),
      ) * this.zoom();
    const contentWidth = (maxX - minX) * scale;
    const contentHeight = (maxY - minY) * scale;
    const x = (point: { x: number }) =>
      (width - contentWidth) / 2 + (point.x - minX) * scale;
    const y = (point: { y: number }) =>
      (height + contentHeight) / 2 - (point.y - minY) * scale;
    return `M ${x(path.from).toFixed(2)} ${y(path.from).toFixed(2)} L ${x(path.to).toFixed(2)} ${y(path.to).toFixed(2)}`;
  }
  summary(): string {
    const report = this.report();
    if (!report) {
      return '';
    }
    return report.coverage.linear === GcodeCoverage.Recognised
      ? 'Recognised linear paths - review the disclosed model'
      : 'Incomplete path review - inspect source evidence and native preview';
  }
  focusEvidence(item: GcodeEvidence): void {
    this.evidence.set(item);
    const layer = this.report()?.layers.findIndex((candidate) =>
      candidate.paths.some((path) => path.line === item.line),
    );
    if (layer !== undefined && layer >= 0) {
      this.setLayer(layer);
    }
    setTimeout(() => document.getElementById('source-evidence')?.focus(), 0);
  }
  async copyEvidence(): Promise<void> {
    const item = this.evidence();
    if (item) {
      try {
        await navigator.clipboard.writeText(
          `Line ${item.line}: ${item.excerpt}`,
        );
        this.message.set('Evidence excerpt copied.');
      } catch {
        this.message.set('Select the visible excerpt and copy it manually.');
      }
    }
  }
  cancel(): void {
    this.reset();
    this.parsing.set(false);
    this.message.set('Review cancelled. No partial result was retained.');
  }
  ngOnDestroy(): void {
    this.request++;
    this.worker?.terminate();
    this.rejectWorker?.(new Error('Review cancelled.'));
  }
  record() {
    const report = this.report();
    if (!report) {
      return null;
    }
    const { layers, ...result } = report;
    return {
      schema: 'inspectmesh-gcode-review',
      version: GCODE_REPORT_VERSION,
      file: {
        label: this.file()?.name,
        bytes: this.file()?.size,
        sha256: this.hash(),
      },
      report: result,
      previewLayers: layers.length,
      coordinateFrame: {
        min: { x: this.minX(), y: this.minY(), z: this.minZ() },
        max: { x: this.buildX(), y: this.buildY(), z: this.buildZ() },
        basis:
          'User-entered logical coordinate bounds; initial minima zero are an explicit assumption, not inferred from printer name.',
      },
      coordinateObservations: {
        linear: this.volumeMessage(),
        extrusion: this.extrusionMessage(),
      },
      temperatureInputs: {
        hotend: this.maximumHotend(),
        bed: this.maximumBed(),
        observation: this.temperatureLimitMessage(),
      },
      estimateReview: {
        confirmed: this.reviewed(),
        hours: this.reviewedHours(),
        grams: this.reviewedGrams(),
        editedHours:
          report.duration !== null &&
          this.reviewedHours() !== report.duration.value,
        editedGrams:
          report.material !== null &&
          this.reviewedGrams() !== report.material.value,
      },
      limitations: [
        'Read-only linear model, no firmware execution or collision simulation.',
        'Byte hash matches exact bytes, not author identity or machine compatibility.',
        'Bounded excerpts only; raw source and full paths are omitted.',
        'Visible layer rendering shows at most the first 2,000 retained paths per layer; geometry extents include all reviewed linear moves.',
        ...report.limitations,
      ],
    };
  }
  recordSummary(): string {
    // All export views deliberately share this record, including unavailable metrics.
    return JSON.stringify(this.record(), null, 2);
  }
  downloadJson(): void {
    const blob = new Blob([this.recordSummary()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'inspectmesh-gcode-review.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async copyReport(): Promise<void> {
    this.exportText.set(this.recordSummary());
    try {
      await navigator.clipboard.writeText(this.exportText());
      this.message.set('Review record copied.');
    } catch {
      this.message.set('Copy the record from the read-only text below.');
    }
  }
  async pdf(): Promise<void> {
    const pdf = await createPdf();
    pdf.setFontSize(14);
    pdf.text('InspectMesh G-code review', 15, 14);
    pdf.setFont('courier', 'normal');
    pdf.setFontSize(9);
    const lines: string[] = pdf.splitTextToSize(this.recordSummary(), 180);
    let y = 24;
    for (const line of lines) {
      if (y > 280) {
        pdf.addPage();
        y = 15;
      }
      pdf.text(line, 15, y);
      y += 4;
    }
    const pages = pdf.getNumberOfPages();
    for (let index = 1; index <= pages; index++) {
      pdf.setPage(index);
      pdf.text(`InspectMesh read-only review - ${index} / ${pages}`, 15, 290);
    }
    pdf.save('inspectmesh-gcode-review.pdf');
  }
  print(): void {
    this.exportText.set(this.recordSummary());
    setTimeout(() => window.print(), 0);
  }
  setEstimate(target: typeof this.reviewedHours, event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const value = Number(raw);
    target.set(raw && Number.isFinite(value) && value > 0 ? value : null);
    this.reviewed.set(false);
  }
  async offer(destination: PlanningDestination): Promise<void> {
    const report = this.report();
    if (!report || !this.reviewed()) {
      return;
    }
    const hours = report.duration ? this.reviewedHours() : null;
    const grams = report.material ? this.reviewedGrams() : null;
    const value = destination === PlanningDestination.Spool ? grams : hours;
    if (destination !== PlanningDestination.Cost && value === null) {
      return;
    }
    if (hours === null && grams === null) {
      return;
    }
    const basis = `G-code declaration reviewed for one sliced run. Slicer label: ${report.metadata.slicer ?? 'unavailable'} (unverified declaration). Duration source: ${report.duration?.source ?? 'unavailable'} at line ${report.duration?.line ?? 'unavailable'}; material source: ${report.material?.source ?? 'unavailable'} at line ${report.material?.line ?? 'unavailable'}. Offered hours=${hours ?? 'unavailable'}, grams=${grams ?? 'unavailable'}; manually edited hours=${report.duration !== null && hours !== report.duration.value}, grams=${report.material !== null && grams !== report.material.value}. No automatic repeats, quantity, reserve or warm-up.`;
    this.planning.offer({
      destination,
      gcodeSource: true,
      value: value ?? grams!,
      basis,
      sliced:
        destination === PlanningDestination.Cost ? { hours, grams } : undefined,
    });
    await this.router.navigateByUrl(
      destination === PlanningDestination.Cost
        ? PublicRouteUrl.PrintCostCalculator
        : destination === PlanningDestination.Spool
          ? PublicRouteUrl.FilamentRemainingCalculator
          : PublicRouteUrl.PrintFinishTimeCalculator,
    );
  }

  temperatures(
    targets: readonly { value: number; waiting: boolean }[],
  ): string {
    return targets.length
      ? targets
          .map(
            (target) =>
              `${target.value}°${target.waiting ? ' (wait)' : ' (set)'}`,
          )
          .join(', ')
      : 'Not provided by this file';
  }
  format(value: number): string {
    return value.toFixed(2);
  }
  setMaximum(signalToSet: typeof this.maximumHotend, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    signalToSet.set(Number.isFinite(value) && value > 0 ? value : null);
  }
  private reset(): void {
    this.exampleRequest++;
    this.planning.invalidateGcodeOffers();
    this.request++;
    this.worker?.terminate();
    this.rejectWorker?.(new Error('Previous review cancelled.'));
    this.worker = null;
    this.rejectWorker = null;
    this.parsing.set(false);
    this.evidence.set(null);
    this.hash.set(null);
    this.exportText.set('');
    this.reviewed.set(false);
    this.reviewedHours.set(null);
    this.reviewedGrams.set(null);
    this.file.set(null);
    this.report.set(null);
    this.error.set('');
    this.zoom.set(1);
    this.previewUsed.set(false);
    this.volumeUsed.set(false);
  }
  private parseInWorker(text: string): Promise<GcodeReport> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL('./gcode-parser.worker', import.meta.url),
      );
      this.worker = worker;
      this.rejectWorker = reject;
      worker.addEventListener(
        'message',
        ({ data }: MessageEvent<{ report?: GcodeReport; error?: string }>) => {
          worker.terminate();
          if (data.report) {
            resolve(data.report);
          } else {
            reject(
              new Error(data.error ?? 'Could not parse this G-code safely.'),
            );
          }
        },
        { once: true },
      );
      worker.addEventListener(
        'error',
        () => {
          worker.terminate();
          reject(new Error('Could not parse this G-code safely.'));
        },
        { once: true },
      );
      worker.postMessage({ text });
    });
  }
}
