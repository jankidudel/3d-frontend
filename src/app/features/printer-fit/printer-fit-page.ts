import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import {
  ModelDimensions,
  ModelUnit,
  convertLength,
} from '../../shared/model-dimensions';
import { readStl } from '../stl-reducer/stl-reducer';
import { meshDimensions } from '../stl-print-preflight/stl-print-preflight-analysis';
import { resolveThreeMfWallGeometry } from '../shared/wall-thickness/three-mf-wall-thickness';
import { printers, printerById } from '../printer-comparison/printer-catalogue';
import {
  assessPrinterFit,
  axisLabel,
  FitVerdict,
} from './printer-fit-analysis';

export const PrinterFitFileKind = {
  Stl: 'stl',
  ThreeMf: '3mf',
} as const;

type FileKind = (typeof PrinterFitFileKind)[keyof typeof PrinterFitFileKind];

export const PrinterFitOrientationMode = {
  Current: 'current',
  Automatic: 'automatic',
} as const;

type OrientationMode =
  (typeof PrinterFitOrientationMode)[keyof typeof PrinterFitOrientationMode];

@Component({
  selector: 'app-printer-fit-page',
  imports: [ToolEvidenceComponent, RouterLink],
  templateUrl: './printer-fit-page.html',
  styleUrl: './printer-fit-page.scss',
})
export class PrinterFitPage {
  readonly routeUrl = PublicRouteUrl;
  readonly printers = printers.filter((printer) => printer.published !== false);
  private readonly route = inject(ActivatedRoute);
  readonly selectedPrinterId = signal(
    this.route.snapshot.queryParamMap.get('printer') ??
      this.printers[0]?.id ??
      '',
  );
  readonly stlUnit = signal<ModelUnit>('mm');
  readonly margin = signal(0);
  readonly orientationMode = signal<OrientationMode>(
    PrinterFitOrientationMode.Automatic,
  );
  readonly customVolume = signal<ModelDimensions | null>(null);
  readonly dimensions = signal<ModelDimensions | null>(null);
  readonly fileKind = signal<FileKind | null>(null);
  readonly error = signal('');
  readonly progress = signal('');
  readonly selectedPrinter = computed(() =>
    printerById(this.selectedPrinterId()),
  );
  readonly resolvedDimensions = computed(() => {
    const dimensions = this.dimensions();
    if (!dimensions) {
      return null;
    }
    if (this.fileKind() === PrinterFitFileKind.Stl) {
      return this.convertDimensions(dimensions, this.stlUnit());
    }
    return dimensions;
  });
  readonly buildVolume = computed(
    () =>
      this.customVolume() ??
      (this.selectedPrinter().buildVolumeMm && {
        width: this.selectedPrinter().buildVolumeMm[0],
        height: this.selectedPrinter().buildVolumeMm[1],
        depth: this.selectedPrinter().buildVolumeMm[2],
      }),
  );
  readonly assessment = computed(() => {
    const model = this.resolvedDimensions();
    const volume = this.buildVolume();
    if (!model || !volume) {
      return null;
    }
    const assessment = assessPrinterFit(model, volume, this.margin());
    if (
      !assessment ||
      this.orientationMode() === PrinterFitOrientationMode.Automatic
    ) {
      return assessment;
    }
    const orientation = assessment.currentOrientation;
    return {
      ...assessment,
      orientation,
      verdict: orientation.fit.fits
        ? FitVerdict.Fits
        : orientation.fit.maximumScalePercentage > 0
          ? FitVerdict.RequiresScaling
          : FitVerdict.DoesNotFit,
      recommendedScalePercentage: Math.min(
        orientation.fit.maximumScalePercentage,
        100,
      ),
    };
  });
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: '3D Printer Fit Checker - Will Your STL or 3MF Fit?',
      description:
        'Upload an STL or 3MF file, choose a 3D printer and check build-volume fit, orientation, clearance and required scaling.',
      path: PublicRouteUrl.PrinterFitChecker,
    });
  }

  async chooseFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.item(0);
    this.error.set('');
    this.progress.set('');
    this.dimensions.set(null);
    this.fileKind.set(null);
    if (!file) {
      return;
    }
    const kind = file.name.toLowerCase().endsWith('.stl')
      ? PrinterFitFileKind.Stl
      : file.name.toLowerCase().endsWith('.3mf')
        ? PrinterFitFileKind.ThreeMf
        : null;
    if (!kind || file.size === 0 || file.size > getMaxFileUploadSizeLimit()) {
      this.error.set('Choose a non-empty STL or 3MF file up to 25 MiB.');
      return;
    }
    try {
      this.progress.set(
        kind === PrinterFitFileKind.Stl
          ? 'Reading STL geometry locally…'
          : 'Resolving 3MF build geometry locally…',
      );
      const dimensions =
        kind === PrinterFitFileKind.Stl
          ? meshDimensions(await readStl(file))
          : meshDimensions(
              (await resolveThreeMfWallGeometry(await file.arrayBuffer()))
                .geometry,
            );
      if (
        Object.values(dimensions).some(
          (value) => !Number.isFinite(value) || value <= 0,
        )
      ) {
        throw new Error('invalid-dimensions');
      }
      this.dimensions.set(dimensions);
      this.fileKind.set(kind);
      this.progress.set(
        'Fit check ready. Your file was processed locally in this browser.',
      );
    } catch {
      this.error.set(
        kind === PrinterFitFileKind.Stl
          ? 'We could not read that STL file.'
          : 'We could not resolve that 3MF build locally. Choose a standard mesh-based 3MF file.',
      );
    }
  }

  setPrinter(event: Event): void {
    this.selectedPrinterId.set((event.target as HTMLSelectElement).value);
    this.customVolume.set(null);
  }
  setStlUnit(event: Event): void {
    this.stlUnit.set((event.target as HTMLSelectElement).value as ModelUnit);
  }
  setMargin(event: Event): void {
    this.margin.set(
      Math.max(0, Number((event.target as HTMLInputElement).value) || 0),
    );
  }
  setOrientation(event: Event): void {
    this.orientationMode.set(
      (event.target as HTMLSelectElement).value as OrientationMode,
    );
  }
  setCustom(axis: string, event: Event): void {
    if (axis !== 'width' && axis !== 'height' && axis !== 'depth') {
      return;
    }
    const value = Number((event.target as HTMLInputElement).value);
    const next = this.customVolume() ?? { width: 0, height: 0, depth: 0 };
    this.customVolume.set({ ...next, [axis]: value });
  }
  clearCustom(): void {
    this.customVolume.set(null);
  }
  format(value: number): string {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  axisLabel = axisLabel;

  private convertDimensions(
    dimensions: ModelDimensions,
    unit: ModelUnit,
  ): ModelDimensions {
    return {
      width: convertLength(dimensions.width, unit, 'mm'),
      height: convertLength(dimensions.height, unit, 'mm'),
      depth: convertLength(dimensions.depth, unit, 'mm'),
    };
  }
}
