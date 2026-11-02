import { computed, signal } from '@angular/core';
import {
  BedShape,
  PRINTER_PROFILE_VERSION,
  PrinterProfileService,
  isPrinterProfile,
} from '../core/printer/printer-profile.service';
import { DimensionAxis, ModelUnit } from './model-dimensions';

export interface PrinterPreset {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

export const PRINTER_PRESETS: readonly PrinterPreset[] = [
  {
    label: 'Compact FDM - 180 x 180 x 180 mm',
    width: 180,
    height: 180,
    depth: 180,
  },
  {
    label: 'Typical FDM - 220 x 220 x 250 mm',
    width: 220,
    height: 220,
    depth: 250,
  },
  {
    label: 'Large FDM - 300 x 300 x 300 mm',
    width: 300,
    height: 300,
    depth: 300,
  },
  {
    label: 'Resin desktop - 130 x 80 x 165 mm',
    width: 130,
    height: 80,
    depth: 165,
  },
];

export class PrinterFitControls {
  readonly buildWidth = signal<number | null>(null);
  readonly buildHeight = signal<number | null>(null);
  readonly buildDepth = signal<number | null>(null);
  readonly buildUnit = signal<ModelUnit>('mm');
  readonly buildVolumeTouched = signal(false);
  readonly presets = PRINTER_PRESETS;
  readonly shape = signal<BedShape>(BedShape.Rectangular);
  readonly diameter = signal<number | null>(null);
  readonly legacy;
  readonly needsReview;
  readonly draft = computed(() => {
    const circular = this.shape() === BedShape.Circular;
    const p = {
      schemaVersion: PRINTER_PROFILE_VERSION,
      shape: this.shape(),
      x: (circular ? this.diameter() : this.buildWidth()) ?? 0,
      y: (circular ? this.diameter() : this.buildHeight()) ?? 0,
      z: this.buildDepth() ?? 0,
      diameter: circular ? (this.diameter() ?? 0) : undefined,
      unit: this.buildUnit(),
    };
    return isPrinterProfile(p) ? p : null;
  });
  readonly message = signal('');

  constructor(private readonly profiles: PrinterProfileService) {
    this.legacy = profiles.legacy;
    this.needsReview = profiles.needsReview;
    const profile = profiles.profile();
    if (profile) {
      this.buildWidth.set(profile.x);
      this.buildHeight.set(profile.y);
      this.buildDepth.set(profile.z);
      this.buildUnit.set(profile.unit);
      this.shape.set(profile.shape);
      this.diameter.set(profile.diameter ?? null);
    }
  }

  setDimension(axis: DimensionAxis, event: Event): void {
    const text = (event.target as HTMLInputElement).value.trim();
    const value = text === '' ? null : Number(text);
    this.buildVolumeTouched.set(true);
    if (axis === 'width') {
      this.buildWidth.set(value);
    } else if (axis === 'height') {
      this.buildHeight.set(value);
    } else {
      this.buildDepth.set(value);
    }
    this.message.set(
      'Session settings changed. Save explicitly to update the shared profile.',
    );
  }
  setUnit(event: Event): void {
    this.buildUnit.set((event.target as HTMLSelectElement).value as ModelUnit);
    this.message.set(
      'Session settings changed. Save explicitly to update the shared profile.',
    );
  }
  applyPreset(event: Event): void {
    const preset =
      this.presets[Number((event.target as HTMLSelectElement).value)];
    if (!preset) {
      return;
    }
    this.shape.set(BedShape.Rectangular);
    this.buildWidth.set(preset.width);
    this.buildHeight.set(preset.height);
    this.buildDepth.set(preset.depth);
    this.buildUnit.set('mm');
    this.buildVolumeTouched.set(true);
    this.message.set(
      'Session settings changed. Save explicitly to update the shared profile.',
    );
  }
  clear(): void {
    this.profiles.clear();
    this.buildWidth.set(null);
    this.buildHeight.set(null);
    this.buildDepth.set(null);
    this.diameter.set(null);
    this.shape.set(BedShape.Rectangular);
    this.message.set('Saved profile cleared. Enter session dimensions.');
  }
  orientationName(axisSources: Record<DimensionAxis, DimensionAxis>): string {
    const labels = { width: 'X', height: 'Y', depth: 'Z' };
    return `Place source ${labels[axisSources.width]} along printer X, source ${labels[axisSources.height]} along Y and source ${labels[axisSources.depth]} along Z`;
  }
  limitingAxes(axes: readonly DimensionAxis[]): string {
    return axes
      .map((axis) => ({ width: 'X', height: 'Y', depth: 'Z' })[axis])
      .join(' and ');
  }
  save(): void {
    const p = this.draft();
    if (!p) {
      this.message.set(
        'Enter positive finite dimensions and confirm the shape and units.',
      );
      return;
    }
    this.profiles.save(p);
    this.message.set(
      'Confirmed X/Y/Z and shape saved for this device or session.',
    );
  }
}
