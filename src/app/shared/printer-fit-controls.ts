import { signal } from '@angular/core';
import { PrinterProfileService } from '../core/printer/printer-profile.service';
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
    height: 250,
    depth: 220,
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
    height: 165,
    depth: 80,
  },
];

export class PrinterFitControls {
  readonly buildWidth = signal<number | null>(null);
  readonly buildHeight = signal<number | null>(null);
  readonly buildDepth = signal<number | null>(null);
  readonly buildUnit = signal<ModelUnit>('mm');
  readonly buildVolumeTouched = signal(false);
  readonly presets = PRINTER_PRESETS;

  constructor(private readonly profiles: PrinterProfileService) {
    const profile = profiles.profile();
    if (profile) {
      this.buildWidth.set(profile.width);
      this.buildHeight.set(profile.height);
      this.buildDepth.set(profile.depth);
      this.buildUnit.set(profile.unit);
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
    this.save();
  }
  setUnit(event: Event): void {
    this.buildUnit.set((event.target as HTMLSelectElement).value as ModelUnit);
    this.save();
  }
  applyPreset(event: Event): void {
    const preset =
      this.presets[Number((event.target as HTMLSelectElement).value)];
    if (!preset) {
      return;
    }
    this.buildWidth.set(preset.width);
    this.buildHeight.set(preset.height);
    this.buildDepth.set(preset.depth);
    this.buildUnit.set('mm');
    this.buildVolumeTouched.set(true);
    this.save();
  }
  clear(): void {
    this.profiles.clear();
  }
  orientationName(axisSources: Record<DimensionAxis, DimensionAxis>): string {
    return `Place the current ${axisSources.width} along the printer's X axis, ${axisSources.height} along Y and ${axisSources.depth} along Z`;
  }
  limitingAxes(axes: readonly DimensionAxis[]): string {
    return axes
      .map((axis) => ({ width: 'X', height: 'Y', depth: 'Z' })[axis])
      .join(' and ');
  }
  private save(): void {
    const width = this.buildWidth(),
      height = this.buildHeight(),
      depth = this.buildDepth();
    if (width === null || height === null || depth === null) {
      return;
    }
    this.profiles.save({ width, height, depth, unit: this.buildUnit() });
  }
}
