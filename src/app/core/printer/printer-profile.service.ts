import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import {
  MODEL_UNITS,
  ModelUnit,
  convertLength,
  ModelDimensions,
} from '../../shared/model-dimensions';

export const BedShape = {
  Rectangular: 'rectangular',
  Circular: 'circular',
} as const;
export type BedShape = (typeof BedShape)[keyof typeof BedShape];
export const PRINTER_PROFILE_VERSION = 2;
export interface PrinterProfile {
  readonly schemaVersion: typeof PRINTER_PROFILE_VERSION;
  readonly shape: BedShape;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly diameter?: number;
  readonly unit: ModelUnit;
}
export const PRINTER_PROFILE_STORAGE_KEY = 'inspectmesh_printer_profile_v1';
export const CONFIRMED_PRINTER_PROFILE_STORAGE_KEY =
  'inspectmesh_printer_profile_v2';
function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}
export function isPrinterProfile(value: unknown): value is PrinterProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const p = value as Record<string, unknown>;
  return (
    p['schemaVersion'] === PRINTER_PROFILE_VERSION &&
    (p['shape'] === BedShape.Rectangular || p['shape'] === BedShape.Circular) &&
    positive(p['x']) &&
    positive(p['y']) &&
    positive(p['z']) &&
    (p['shape'] !== BedShape.Circular ||
      (positive(p['diameter']) &&
        p['x'] === p['diameter'] &&
        p['y'] === p['diameter'])) &&
    MODEL_UNITS.includes(p['unit'] as ModelUnit)
  );
}
/** Explicit adapter: mesh width/height/depth means X/Y/Z, always in mm here. */
export function printerDimensionsMm(p: PrinterProfile): ModelDimensions {
  return {
    width: convertLength(p.x, p.unit, 'mm'),
    height: convertLength(p.y, p.unit, 'mm'),
    depth: convertLength(p.z, p.unit, 'mm'),
  };
}
export function printerProfileMm(p: PrinterProfile): PrinterProfile {
  const d = printerDimensionsMm(p);
  return {
    ...p,
    x: d.width,
    y: d.height,
    z: d.depth,
    diameter:
      p.diameter === undefined
        ? undefined
        : convertLength(p.diameter, p.unit, 'mm'),
    unit: 'mm',
  };
}
@Injectable({ providedIn: 'root' })
export class PrinterProfileService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly invalidStored = signal(false);
  readonly legacyRaw = signal<string | null>(null);
  readonly legacy = computed(() => {
    try {
      const value: unknown = JSON.parse(this.legacyRaw() ?? 'null');
      if (!value || typeof value !== 'object') {
        return null;
      }
      const p = value as Record<string, unknown>;
      return {
        width: String(p['width'] ?? ''),
        height: String(p['height'] ?? ''),
        depth: String(p['depth'] ?? ''),
        unit: String(p['unit'] ?? ''),
      };
    } catch {
      return null;
    }
  });
  readonly profile = signal<PrinterProfile | null>(this.load());
  readonly needsReview = computed(
    () =>
      (this.legacyRaw() !== null || this.invalidStored()) &&
      this.profile() === null,
  );
  save(profile: PrinterProfile): void {
    if (!isPrinterProfile(profile)) {
      return;
    }
    this.profile.set({ ...profile });
    this.invalidStored.set(false);
    if (this.isBrowser) {
      try {
        localStorage.setItem(
          CONFIRMED_PRINTER_PROFILE_STORAGE_KEY,
          JSON.stringify(profile),
        );
      } catch {
        // Confirmed dimensions remain available for this session.
      }
    }
  }
  clear(): void {
    this.profile.set(null);
    this.legacyRaw.set(null);
    this.invalidStored.set(false);
    if (this.isBrowser) {
      try {
        localStorage.removeItem(CONFIRMED_PRINTER_PROFILE_STORAGE_KEY);
        localStorage.removeItem(PRINTER_PROFILE_STORAGE_KEY);
      } catch {
        // Clearing the active session still works without storage.
      }
    }
  }
  private load(): PrinterProfile | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      this.legacyRaw.set(localStorage.getItem(PRINTER_PROFILE_STORAGE_KEY));
      const raw = localStorage.getItem(CONFIRMED_PRINTER_PROFILE_STORAGE_KEY);
      this.invalidStored.set(raw !== null);
      const value: unknown = JSON.parse(raw ?? 'null');
      if (isPrinterProfile(value)) {
        this.invalidStored.set(false);
        return value;
      }
      return null;
    } catch {
      return null;
    }
  }
}
