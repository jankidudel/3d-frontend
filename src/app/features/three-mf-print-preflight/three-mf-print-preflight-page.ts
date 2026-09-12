import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PrinterProfileService } from '../../core/printer/printer-profile.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import {
  assessPrinterOrientations,
  ModelDimensions,
} from '../../shared/model-dimensions';
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
  imports: [RouterLink, ThreeMfFilePicker],
  templateUrl: './three-mf-print-preflight-page.html',
  styleUrl: './three-mf-print-preflight-page.scss',
})
export class ThreeMfPrintPreflightPage {
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
  readonly printerPreset = signal('standard');
  readonly progress = signal('');
  readonly error = signal('');
  readonly analysing = signal(false);
  readonly buildVolume = computed(() => {
    const savedProfile = this.savedPrinterProfile();
    return this.printerPreset() === 'saved' && savedProfile
      ? {
          width: savedProfile.width,
          height: savedProfile.height,
          depth: savedProfile.depth,
        }
      : (PRINTER_PRESETS[this.printerPreset()] ?? PRINTER_PRESETS['standard']);
  });
  readonly buildVolumeUnit = computed(() => {
    const savedProfile = this.savedPrinterProfile();
    return this.printerPreset() === 'saved' && savedProfile
      ? savedProfile.unit
      : 'mm';
  });
  readonly orientation = computed(() => {
    const dimensions = this.dimensions();
    return dimensions
      ? assessPrinterOrientations(
          dimensions,
          'mm',
          this.buildVolume(),
          this.buildVolumeUnit(),
        )
      : null;
  });
  readonly fitsPrinter = computed(
    () => this.orientation()?.recommended !== null,
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

  async onFileSelected(file: File | null): Promise<void> {
    this.reset();
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
      this.resolved.set(resolved);
      await this.yieldToBrowser();
      this.progress.set(
        'Checking resolved mesh integrity, size and printer fit...',
      );
      await this.yieldToBrowser();
      this.progress.set('Sampling wall thickness...');
      this.wallReport.set(
        analyseWallThickness(
          resolved.geometry,
          1.2,
          WallThicknessUnit.Millimetres,
        ),
      );
      this.progress.set('3MF preflight report ready.');
    } catch (error: unknown) {
      this.error.set(
        error instanceof Error && error.message === 'unsupported-unit'
          ? 'This 3MF declares an unsupported unit, so its physical dimensions cannot be checked safely.'
          : 'We could not resolve this 3MF print build locally. Choose a standard, unencrypted mesh-based 3MF with a readable model package.',
      );
    } finally {
      this.analysing.set(false);
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
