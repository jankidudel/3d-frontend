import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PrinterProfileService } from '../../core/printer/printer-profile.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { GuideSlug } from '../guides/generated/guide-slug.generated';
import { SeoService } from '../../core/seo/seo.service';
import {
  buildVolumeMessage,
  dimensions,
  GcodeLayer,
  GcodeReport,
  layerMoveCounts,
} from './gcode-parser';

@Component({
  selector: 'app-gcode-preflight-page',
  imports: [ToolEvidenceComponent, RouterLink],
  templateUrl: './gcode-preflight-page.html',
  styleUrl: './gcode-preflight-page.scss',
})
export class GcodePreflightPage {
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
      ? buildVolumeMessage(report, { x, y, z })
      : null;
  });
  readonly savedProfileVolumeMessage = computed(() => {
    const profile = this.printerProfile();
    const report = this.report();
    return profile?.unit === 'mm' && report
      ? buildVolumeMessage(report, {
          x: profile.width,
          y: profile.depth,
          z: profile.height,
        })
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
    try {
      const { ownedDemoFile, DemoAsset } =
        await import('../repeat-workflows/demo-file');
      await this.loadFile(
        await ownedDemoFile(classic ? DemoAsset.Classic : DemoAsset.Arachne),
      );
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The example could not be loaded.',
      );
    }
  }
  async loadFile(file: File | null | undefined): Promise<void> {
    this.reset();
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
      const parsed = await this.parseInWorker(await file.text());
      this.report.set(parsed);
      this.selectedLayer.set(0);
      this.analytics.trackGcodeParsed();
      if (parsed.limitations.length) {
        this.analytics.trackGcodeLimitationShown();
      }
    } catch (error) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'Could not parse this G-code safely.',
      );
    } finally {
      this.parsing.set(false);
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
    const layer = this.selected();
    if (!layer?.paths.length) {
      return '';
    }
    // Fit the preview to printed paths. A start-position travel may begin at a
    // printer origin far from the model and should not shrink the useful view.
    const extrusionPaths = layer.paths.filter((item) => item.extrusion);
    const paths = extrusionPaths.length ? extrusionPaths : layer.paths;
    const points = paths.flatMap((item) => [item.from, item.to]);
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
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
    if (report.limitations.length > 2) {
      return 'Unsupported or incomplete G-code analysis';
    }
    return report.limitations.length
      ? 'G-code parsed with limitations'
      : 'G-code parsed — review before printing';
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
