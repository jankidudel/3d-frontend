import { describe, expect, it } from 'vitest';
import {
  assessPrinterFit,
  FitVerdict,
  subtractMargin,
} from './printer-fit-analysis';

describe('printer fit analysis', () => {
  it('reports an exact fit after applying the margin', () => {
    expect(
      assessPrinterFit(
        { width: 100, height: 100, depth: 100 },
        { width: 104, height: 104, depth: 104 },
        2,
      )?.verdict,
    ).toBe(FitVerdict.Fits);
  });

  it('finds a right-angle rotation and caps its recommendation at 100 percent', () => {
    const result = assessPrinterFit(
      { width: 250, height: 260, depth: 100 },
      { width: 256, height: 256, depth: 300 },
      0,
    );
    expect(result?.verdict).toBe(FitVerdict.FitsAfterRotation);
    expect(result?.recommendedScalePercentage).toBe(100);
  });

  it('calculates scale for an oversized model', () => {
    const result = assessPrinterFit(
      { width: 260, height: 100, depth: 100 },
      { width: 256, height: 256, depth: 256 },
      0,
    );
    expect(result?.verdict).toBe(FitVerdict.RequiresScaling);
    expect(result?.recommendedScalePercentage).toBeCloseTo((256 / 260) * 100);
  });

  it('rejects a margin that consumes the usable build volume', () => {
    expect(subtractMargin({ width: 10, height: 10, depth: 10 }, 5)).toBeNull();
  });
});
