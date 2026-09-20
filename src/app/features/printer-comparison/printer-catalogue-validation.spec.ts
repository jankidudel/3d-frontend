import { describe, expect, it } from 'vitest';
import { printers } from './printer-catalogue';
import { validatePrinterCatalogue } from './printer-catalogue-validation';

describe('printer catalogue validation', () => {
  it('accepts the published catalogue', () => {
    expect(validatePrinterCatalogue(printers)).toEqual([]);
  });

  it('rejects duplicated slugs and invalid build volumes', () => {
    const invalid = {
      ...printers[0],
      id: printers[0].id,
      slug: printers[0].slug,
      buildVolumeMm: [0, 1, 1] as const,
    };
    expect(validatePrinterCatalogue([printers[0], invalid]).join(' ')).toMatch(
      /Duplicate printer id.*Duplicate printer slug.*invalid build volume/,
    );
  });
});
