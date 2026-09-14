import { describe, expect, it } from 'vitest';
import {
  calculateShrinkage,
  calculateShrinkageAxis,
} from './shrinkage-calculator';

describe('calculateShrinkageAxis', () => {
  it('derives shrinkage and a scale factor from a measured calibration feature', () => {
    const result = calculateShrinkageAxis({
      designed: 20,
      measured: 19.8,
      target: 50,
    });
    expect(result?.shrinkagePercent).toBeCloseTo(1);
    expect(result?.scalePercent).toBeCloseTo(101.0101);
    expect(result?.compensatedModelDimension).toBeCloseTo(50.5051);
  });

  it('rejects incomplete or non-positive dimensions', () => {
    expect(
      calculateShrinkageAxis({ designed: 20, measured: 0, target: 50 }),
    ).toBeNull();
  });
});

describe('calculateShrinkage', () => {
  it('requires a valid measurement for every axis', () => {
    expect(
      calculateShrinkage(
        { designed: 20, measured: 20, target: 30 },
        { designed: 20, measured: 20, target: 30 },
        { designed: 20, measured: -1, target: 30 },
      ),
    ).toBeNull();
  });
});
