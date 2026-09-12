import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { ModelDimensions, ModelUnit } from '../../shared/model-dimensions';

export interface PrinterProfile extends ModelDimensions {
  readonly unit: ModelUnit;
}

export const PRINTER_PROFILE_STORAGE_KEY = 'inspectmesh_printer_profile_v1';
const MODEL_UNITS: readonly ModelUnit[] = ['mm', 'cm', 'm', 'in'];

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function isPrinterProfile(value: unknown): value is PrinterProfile {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const profile = value as Record<string, unknown>;
  return (
    isPositiveFiniteNumber(profile['width']) &&
    isPositiveFiniteNumber(profile['height']) &&
    isPositiveFiniteNumber(profile['depth']) &&
    typeof profile['unit'] === 'string' &&
    MODEL_UNITS.includes(profile['unit'] as ModelUnit)
  );
}

@Injectable({ providedIn: 'root' })
export class PrinterProfileService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly profile = signal<PrinterProfile | null>(this.load());

  save(profile: PrinterProfile): void {
    if (!isPrinterProfile(profile)) {
      return;
    }
    this.profile.set(profile);
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(
        PRINTER_PROFILE_STORAGE_KEY,
        JSON.stringify(profile),
      );
    } catch {
      // The current fit check still works when browser storage is unavailable.
    }
  }

  clear(): void {
    this.profile.set(null);
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.removeItem(PRINTER_PROFILE_STORAGE_KEY);
    } catch {
      // The current fit check still works when browser storage is unavailable.
    }
  }

  private load(): PrinterProfile | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      const stored = localStorage.getItem(PRINTER_PROFILE_STORAGE_KEY);
      if (!stored) {
        return null;
      }
      const profile: unknown = JSON.parse(stored);
      return isPrinterProfile(profile) ? profile : null;
    } catch {
      return null;
    }
  }
}
