import { describe, expect, it } from 'vitest';
import { curatedComparisons } from './comparison-catalogue';
import { printers, printersById, printersBySlug } from './printer-catalogue';

describe('printer comparison catalogue', () => {
  it('has unique source-backed printer identifiers and valid core dimensions', () => {
    expect(printersById.size).toBe(printers.length);
    expect(printersBySlug.size).toBe(printers.length);
    for (const printer of printers) {
      expect(printer.sources.length).toBeGreaterThan(0);
      expect(printer.lastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(
        printer.sources.every(
          (source) => new URL(source.url).protocol === 'https:',
        ),
      ).toBe(true);
      expect(printer.buildVolumeMm.every((dimension) => dimension > 0)).toBe(
        true,
      );
    }
  });

  it('publishes only unique comparisons with existing printers', () => {
    expect(
      new Set(curatedComparisons.map((comparison) => comparison.slug)).size,
    ).toBe(curatedComparisons.length);
    for (const comparison of curatedComparisons) {
      expect(printersById.has(comparison.leftId)).toBe(true);
      expect(printersById.has(comparison.rightId)).toBe(true);
      expect(comparison.leftId).not.toBe(comparison.rightId);
    }
  });
});
