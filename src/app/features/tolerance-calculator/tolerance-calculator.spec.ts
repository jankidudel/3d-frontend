import { describe, expect, it } from 'vitest';
import {
  calculateCalibrationErrors,
  calculateTolerance,
  FitIntent,
  FIT_PRESETS,
  toleranceSummary,
} from './tolerance-calculator';

describe('tolerance calculator calculations', () => {
  const input = {
    nominalMatingDiameter: 10,
    desiredPrintedPinDiameter: 10,
    desiredClearance: 0.3,
    outsideError: 0.08,
    holeError: -0.1,
  };

  it('calculates hole, pin and radial clearance with signed calibration errors', () => {
    expect(calculateTolerance(input)).toEqual({
      targetPrintedHoleDiameter: 10.3,
      modelledHoleDiameter: 10.4,
      modelledPinDiameter: 9.92,
      radialClearance: 0.15,
    });
  });

  it('supports interference and rejects impossible dimensions', () => {
    expect(
      calculateTolerance({ ...input, desiredClearance: -0.2 })?.radialClearance,
    ).toBe(-0.1);
    expect(
      calculateTolerance({ ...input, nominalMatingDiameter: 0 }),
    ).toBeNull();
    expect(calculateTolerance({ ...input, desiredClearance: -11 })).toBeNull();
  });

  it('derives calibration errors only from positive completed measurements', () => {
    const errors = calculateCalibrationErrors({
      intendedOutside: 10,
      measuredOutside: 10.08,
      intendedHole: 10.3,
      measuredHole: 10.2,
    });
    expect(errors.outsideError).toBeCloseTo(0.08);
    expect(errors.holeError).toBeCloseTo(-0.1);
    expect(
      calculateCalibrationErrors({
        intendedOutside: 0,
        measuredOutside: 10,
        intendedHole: null,
        measuredHole: null,
      }),
    ).toEqual({ outsideError: null, holeError: null });
  });

  it('keeps starting-point presets labelled and values editable in the UI model', () => {
    expect(FIT_PRESETS.map((preset) => preset.label)).toEqual([
      'Close/sliding starting point',
      'General assembly starting point',
      'Loose-moving starting point',
      'Custom',
    ]);
    expect(FIT_PRESETS[0].intent).toBe(FitIntent.Sliding);
  });

  it('creates a copyable summary without hidden values', () => {
    const result = calculateTolerance(input);
    expect(
      result && toleranceSummary(input, result, 'Clearance fit'),
    ).toContain('Modelled hole diameter: 10.400 mm');
  });
});
