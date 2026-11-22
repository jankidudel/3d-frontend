import {
  PrinterProfileService,
  BedShape,
  PRINTER_PROFILE_VERSION,
  printerDimensionsMm,
  printerProfileMm,
  PrinterProfile,
} from '../../core/printer/printer-profile.service';
import {
  assessEnvelope,
  assessProfileOrientations,
} from '../../core/printer/build-space';
import { PrinterFitControls } from '../../shared/printer-fit-controls';
import { PrinterProfileEditor } from '../../shared/printer-profile-editor';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
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
import { axisLabel } from './printer-fit-analysis';

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
  imports: [PrinterProfileEditor, ToolEvidenceComponent, RouterLink],
  templateUrl: './printer-fit-page.html',
  styleUrl: './printer-fit-page.scss',
})
export class PrinterFitPage {
  readonly routeUrl = PublicRouteUrl;
  readonly guideRouteUrl = GuideRouteUrl;
  readonly printerProfiles = inject(PrinterProfileService);
  readonly printerControls = new PrinterFitControls(this.printerProfiles);
  readonly useCustom = signal(
    !!this.printerProfiles.profile() || this.printerProfiles.needsReview(),
  );
  readonly expansion = signal(0);
  readonly activeProfile = computed<PrinterProfile | null>(() => {
    if (this.useCustom()) {
      return this.printerControls.draft();
    }
    const [x, y, z] = this.selectedPrinter().buildVolumeMm;
    return {
      schemaVersion: PRINTER_PROFILE_VERSION,
      shape: BedShape.Rectangular,
      x,
      y,
      z,
      unit: 'mm' as const,
    };
  });
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
  readonly buildVolume = computed(() => {
    const p = this.activeProfile();
    return p ? printerDimensionsMm(p) : null;
  });
  readonly assessment = computed(() => {
    const model = this.resolvedDimensions(),
      profile = this.activeProfile();
    if (!model || !profile) {
      return null;
    }
    const tested = assessProfileOrientations(
      model,
      'mm',
      profile,
      this.margin(),
      this.expansion(),
    );
    if (!tested) {
      return null;
    }
    const orientation =
      this.orientationMode() === PrinterFitOrientationMode.Current
        ? tested.current
        : (tested.recommended ?? tested.nearest!);
    const envelope = assessEnvelope(
      orientation.dimensions,
      'mm',
      profile,
      this.margin(),
      this.expansion(),
    );
    const p = printerProfileMm(profile);
    return {
      orientation,
      envelope,
      shape: profile.shape,
      effectiveVolume: {
        width: p.x - 2 * this.margin(),
        height: p.y - 2 * this.margin(),
        depth: p.z,
      },
      verdict: envelope.state,
      recommendedScalePercentage: Math.min(
        envelope.maximumScalePercentage ?? 0,
        100,
      ),
    };
  });
  private fileRevision = 0;
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: '3D Printer Fit Checker for STL and 3MF Files | InspectMesh',
      description:
        'Choose a 3D printer and check whether your STL or 3MF fits its build volume, with right-angle rotation, clearance and the scale needed if it does not.',
      path: PublicRouteUrl.PrinterFitChecker,
    });
  }

  async chooseFile(event: Event): Promise<void> {
    const revision = ++this.fileRevision;
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
      if (revision !== this.fileRevision) {
        return;
      }
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
      if (revision !== this.fileRevision) {
        return;
      }
      this.error.set(
        kind === PrinterFitFileKind.Stl
          ? 'We could not read that STL file.'
          : 'We could not resolve that 3MF build locally. Choose a standard mesh-based 3MF file.',
      );
    }
  }

  setPrinter(event: Event): void {
    this.selectedPrinterId.set((event.target as HTMLSelectElement).value);
    this.useCustom.set(false);
  }
  setStlUnit(event: Event): void {
    this.stlUnit.set((event.target as HTMLSelectElement).value as ModelUnit);
  }
  setMargin(event: Event): void {
    this.margin.set(Number((event.target as HTMLInputElement).value));
  }
  setOrientation(event: Event): void {
    this.orientationMode.set(
      (event.target as HTMLSelectElement).value as OrientationMode,
    );
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
