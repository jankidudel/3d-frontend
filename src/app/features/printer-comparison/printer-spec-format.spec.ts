import { describe, expect, it } from 'vitest';
import {
  formatPrinterDimensions,
  formatPrinterNumber,
} from './printer-spec-format';
import { printers } from './printer-catalogue';
import {
  compatibilityFor,
  MaterialId,
  materials,
  CompatibilityVerdict,
} from '../materials/material-catalogue';
describe('printer facts and unknown fields', () => {
  it('renders unknown, zero and invalid numbers without implying measurements', () => {
    for (const value of [null, 0, NaN, -1]) {
      expect(formatPrinterNumber(value, 'mm/s')).toBe('Not verified');
    }
    expect(formatPrinterDimensions(null)).toBe('Not verified');
    expect(formatPrinterDimensions([0, 220, 250])).toBe('Not verified');
    expect(formatPrinterDimensions([220, 220, 250])).toBe('220 x 220 x 250 mm');
  });
  it('never stores build volume as physical dimensions or zero as unknown speed', () => {
    for (const printer of printers) {
      expect(printer.machineDimensionsMm).not.toEqual(printer.buildVolumeMm);
      expect(printer.maxClaimedSpeedMmS).not.toBe(0);
      expect(printer.maxClaimedAccelerationMmS2).not.toBe(0);
    }
  });
  it('does not mistake exclusion prose or nozzle temperature for documented support', () => {
    const p1p = printers.find((printer) => printer.id === 'bambu-lab-p1p')!;
    const nylon = materials.find(
      (material) => material.id === MaterialId.Nylon,
    )!;
    expect(compatibilityFor(p1p, nylon).verdict).not.toBe(
      CompatibilityVerdict.DocumentedSupported,
    );
    const k1c = printers.find((printer) => printer.id === 'creality-k1c')!;
    expect(compatibilityFor(k1c, nylon).verdict).toBe(
      CompatibilityVerdict.Unknown,
    );
  });
});
