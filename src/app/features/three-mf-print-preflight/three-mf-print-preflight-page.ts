import { assessProfileOrientations } from '../../core/printer/build-space';
import {
  BedShape,
  PRINTER_PROFILE_VERSION,
  printerDimensionsMm,
  PrinterProfile,
} from '../../core/printer/printer-profile.service';
import { ExampleLoader } from '../examples/example-loader';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import {
  ReviewSession,
  ReviewDestination,
} from '../repeat-workflows/review-session';
import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PrinterProfileService } from '../../core/printer/printer-profile.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { ModelDimensions } from '../../shared/model-dimensions';
import {
  inspectMesh,
  meshDimensions,
} from '../stl-print-preflight/stl-print-preflight-analysis';
import {
  analyseWallThickness,
  WallThicknessReport,
  WallThicknessUnit,
} from '../shared/wall-thickness/wall-thickness-analysis';
import {
  resolveThreeMfWallGeometry,
  ResolvedThreeMfGeometry,
} from '../shared/wall-thickness/three-mf-wall-thickness';
import { ThreeMfFilePicker } from '../three-mf/threemf-file-picker';
import {
  THREE_MF_WALL_THICKNESS_LIMITATION,
  threeMfPreflightActions,
  threeMfPreflightStatus,
} from './three-mf-print-preflight-analysis';

const PRINTER_PRESETS: Readonly<Record<string, ModelDimensions>> = {
  compact: { width: 180, height: 180, depth: 180 },
  standard: { width: 220, height: 220, depth: 250 },
  large: { width: 300, height: 300, depth: 300 },
};
const PLA_DENSITY_GRAMS_PER_CUBIC_CENTIMETRE = 1.24;

@Component({
  selector: 'app-three-mf-print-preflight-page',
  imports: [
    ExampleLoader,
    ToolEvidenceComponent,
    RouterLink,
    ThreeMfFilePicker,
  ],
  templateUrl: './three-mf-print-preflight-page.html',
  styleUrl: './three-mf-print-preflight-page.scss',
})
export class ThreeMfPrintPreflightPage {
  readonly loadPublicExample = async (
    files: readonly File[],
  ): Promise<void> => {
    await this.onFileSelected(files[0]);
    if (this.error()) {
      throw new Error(this.error());
    }
  };
  readonly guideRouteUrl = GuideRouteUrl;
  readonly handoff = signal(
    inject(ReviewSession).take(ReviewDestination.Preflight),
  );
  readonly fromCollection = this.handoff() !== null;
  readonly routeUrl = PublicRouteUrl;
  readonly wallThicknessLimitation = THREE_MF_WALL_THICKNESS_LIMITATION;
  private readonly printerProfileService = inject(PrinterProfileService);
  readonly savedPrinterProfile = computed(() =>
    this.printerProfileService.profile(),
  );
  readonly file = signal<File | null>(null);
  readonly resolved = signal<ResolvedThreeMfGeometry | null>(null);
  readonly integrity = computed(() => {
    const resolved = this.resolved();
    return resolved ? inspectMesh(resolved.geometry) : null;
  });
  readonly dimensions = computed(() => {
    const resolved = this.resolved();
    return resolved ? meshDimensions(resolved.geometry) : null;
  });
  readonly wallReport = signal<WallThicknessReport | null>(null);
  readonly printerPreset = signal(
    this.savedPrinterProfile() || this.printerProfileService.needsReview()
      ? 'saved'
      : 'standard',
  );
  readonly progress = signal('');
  readonly error = signal('');
  readonly analysing = signal(false);
  readonly buildVolume = computed(() => {
    const savedProfile = this.savedPrinterProfile();
    return this.printerPreset() === 'saved' && savedProfile
      ? {
          ...printerDimensionsMm(savedProfile),
        }
      : (PRINTER_PRESETS[this.printerPreset()] ?? PRINTER_PRESETS['standard']);
  });
  readonly buildVolumeUnit = computed(() => {
    return 'mm';
  });
  readonly orientation = computed(() => {
    const dimensions = this.dimensions();
    if (
      !dimensions ||
      (this.printerPreset() === 'saved' && !this.savedPrinterProfile())
    ) {
      return null;
    }
    const d = this.buildVolume();
    const p: PrinterProfile | null =
      this.printerPreset() === 'saved'
        ? this.savedPrinterProfile()
        : {
            schemaVersion: PRINTER_PROFILE_VERSION,
            shape: BedShape.Rectangular,
            x: d.width,
            y: d.height,
            z: d.depth,
            unit: 'mm' as const,
          };
    return assessProfileOrientations(dimensions, 'mm', p);
  });
  readonly fitsPrinter = computed(() =>
    this.orientation() ? this.orientation()!.recommended !== null : null,
  );
  readonly packageWarning = computed(
    () => !this.resolved()?.declaredUnitExplicitly,
  );
  readonly estimatedPlaWeight = computed(() => {
    const integrity = this.integrity();
    if (!integrity?.volumeReliable || integrity.volume === null) {
      return null;
    }
    return (integrity.volume / 1_000) * PLA_DENSITY_GRAMS_PER_CUBIC_CENTIMETRE;
  });
  readonly status = computed(() => {
    const integrity = this.integrity();
    if (!integrity) {
      return null;
    }
    return threeMfPreflightStatus(
      integrity,
      (this.wallReport()?.belowThreshold ?? 0) > 0,
      this.fitsPrinter(),
      this.packageWarning(),
    );
  });
  readonly actions = computed(() => {
    const integrity = this.integrity();
    const resolved = this.resolved();
    if (!integrity || !resolved) {
      return [];
    }
    return threeMfPreflightActions(
      integrity,
      (this.wallReport()?.belowThreshold ?? 0) > 0,
      this.fitsPrinter(),
      resolved.geometry.indices.length / 3,
    );
  });
  private readonly seo = inject(SeoService);

  async openHandoff(): Promise<void> {
    const item = this.handoff();
    if (!item) {
      return;
    }
    this.handoff.set(null);
    await this.onFileSelected(item.file);
  }
  constructor() {
    if (this.savedPrinterProfile()) {
      this.printerPreset.set('saved');
    }
    this.seo.apply({
      title: '3MF Print Preflight Checker - Check Before Slicing | InspectMesh',
      description:
        'Check a resolved 3MF print build locally before slicing: package unit, build dimensions, printer fit, mesh integrity, sampled wall thickness, complexity and reliable volume.',
      path: PublicRouteUrl.ThreeMfPrintPreflight,
    });
  }

  async runOwnedExample(): Promise<void> {
    try {
      const { ownedDemoFile, DemoAsset } =
        await import('../repeat-workflows/demo-file');
      await this.onFileSelected(await ownedDemoFile(DemoAsset.Package));
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error
          ? error.message
          : 'The example could not be loaded.',
      );
    }
  }
  private run = 0;
  async onFileSelected(file: File | null): Promise<void> {
    this.reset();
    const run = this.run;
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith('.3mf')) {
      this.error.set('Choose a 3MF file with a .3mf extension.');
      return;
    }
    if (file.size === 0 || file.size > getMaxFileUploadSizeLimit()) {
      this.error.set(
        file.size === 0
          ? 'The selected 3MF file is empty.'
          : 'This file is over the 25 MiB limit. Choose a smaller 3MF file.',
      );
      return;
    }
    this.file.set(file);
    this.analysing.set(true);
    try {
      this.progress.set(
        'Resolving 3MF build items, components and transforms...',
      );
      const resolved = await resolveThreeMfWallGeometry(
        await file.arrayBuffer(),
      );
      if (run !== this.run) {
        return;
      }
      await this.yieldToBrowser();
      this.progress.set(
        'Checking resolved mesh integrity, size and printer fit...',
      );
      if (run !== this.run) {
        return;
      }
      await this.yieldToBrowser();
      if (run !== this.run) {
        return;
      }
      this.progress.set('Sampling wall thickness...');
      this.wallReport.set(
        analyseWallThickness(
          resolved.geometry,
          1.2,
          WallThicknessUnit.Millimetres,
        ),
      );
      this.resolved.set(resolved);
      this.progress.set('3MF preflight report ready.');
    } catch (error: unknown) {
      if (run !== this.run) {
        return;
      }
      this.error.set(
        error instanceof Error
          ? error.message
          : 'We could not resolve this 3MF print build locally.',
      );
    } finally {
      if (run === this.run) {
        this.analysing.set(false);
      }
    }
  }

  setPrinterPreset(value: string): void {
    if (
      value in PRINTER_PRESETS ||
      (value === 'saved' && this.savedPrinterProfile())
    ) {
      this.printerPreset.set(value);
    }
  }

  reset(): void {
    ++this.run;
    this.analysing.set(false);
    this.file.set(null);
    this.resolved.set(null);
    this.wallReport.set(null);
    this.progress.set('');
    this.error.set('');
  }

  format(value: number): string {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  private async yieldToBrowser(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve));
  }
}
