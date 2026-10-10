import { describe, expect, it } from 'vitest';
import {
  calculateCalibrationErrors,
  calculateTolerance,
  FitIntent,
  MatingMode,
  FIT_PRESETS,
  toleranceSummary,
} from './tolerance-calculator';

describe('tolerance calculator calculations', () => {
  const input = {
    matingMode: MatingMode.PrintedPair,
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

  it('uses the selected counterpart and rejects inactive-field interference', () => {
    const changedPin = {
      ...input,
      nominalMatingDiameter: 30,
      desiredPrintedPinDiameter: 10,
      desiredClearance: 0.2,
      holeError: -0.3,
      outsideError: 0.1,
    };
    const pair = calculateTolerance({
      ...changedPin,
      matingMode: MatingMode.PrintedPair,
    });
    expect(pair?.targetPrintedHoleDiameter).toBeCloseTo(10.2);
    expect(pair?.modelledHoleDiameter).toBeCloseTo(10.5);
    expect(pair?.modelledPinDiameter).toBeCloseTo(9.9);
    const fixed = calculateTolerance({
      ...changedPin,
      matingMode: MatingMode.Fixed,
      desiredPrintedPinDiameter: NaN,
      outsideError: Infinity,
    });
    expect(fixed?.targetPrintedHoleDiameter).toBeCloseTo(30.2);
    expect(fixed?.modelledPinDiameter).toBeNull();
    expect(
      calculateTolerance({
        ...changedPin,
        matingMode: MatingMode.PrintedPair,
        nominalMatingDiameter: NaN,
      })?.targetPrintedHoleDiameter,
    ).toBeCloseTo(10.2);
  });
  it('handles zero contact, finite signed errors and corrected dimensions', () => {
    expect(
      calculateTolerance({ ...input, desiredClearance: 0 })?.radialClearance,
    ).toBe(0);
    expect(calculateTolerance({ ...input, holeError: Infinity })).toBeNull();
    expect(calculateTolerance({ ...input, outsideError: NaN })).toBeNull();
    expect(calculateTolerance({ ...input, holeError: 20 })).toBeNull();
    expect(calculateTolerance({ ...input, outsideError: 20 })).toBeNull();
  });

  it('supports interference and rejects impossible dimensions', () => {
    expect(
      calculateTolerance({ ...input, desiredClearance: -0.2 })?.radialClearance,
    ).toBe(-0.1);
    expect(
      calculateTolerance({
        ...input,
        matingMode: MatingMode.Fixed,
        nominalMatingDiameter: 0,
      }),
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
