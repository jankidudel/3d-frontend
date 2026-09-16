import { describe, expect, it } from 'vitest';
import { gramsToMetres, metresToGrams } from './filament-length-calculator';

describe('filament length calculator', () => {
  it('converts PLA weight to a 1.75 mm filament length', () => {
    expect(gramsToMetres(1000, 1.75, 1.24)).toBeCloseTo(335.28, 2);
  });

  it('converts a filament length back to weight', () => {
    const length = gramsToMetres(1000, 1.75, 1.24);
    expect(length).not.toBeNull();
    expect(metresToGrams(length ?? 0, 1.75, 1.24)).toBeCloseTo(1000, 6);
  });

  it('rejects incomplete or impossible values', () => {
    expect(gramsToMetres(0, 1.75, 1.24)).toBeNull();
    expect(metresToGrams(10, -1.75, 1.24)).toBeNull();
  });
});
