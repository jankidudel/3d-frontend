import { describe, expect, it } from 'vitest';
import { calculatePrintCost } from './print-cost';

describe('calculatePrintCost', () => {
  const input = {
    filamentWeightGrams: 80,
    spoolWeightGrams: 1000,
    spoolPrice: 20,
    printHours: 10,
    printerWatts: 120,
    electricityPrice: 0.3,
    machineHourlyCost: 0.25,
    labourHourlyCost: 10,
    labourHours: 0.5,
    extraPartsCost: 1,
    failureAllowancePercent: 5,
    marginPercent: 20,
  };
  it('calculates material, energy, failure allowance and margin separately', () => {
    const result = calculatePrintCost(input);
    expect(result).toMatchObject({
      materialCost: 1.6,
      electricityCost: 0.36,
      machineCost: 2.5,
      labourCost: 5,
      extraPartsCost: 1,
      subtotal: 10.46,
      failureAllowance: 0.523,
      totalCost: 10.983,
      suggestedSellingPrice: 13.1796,
    });
  });
  it('keeps valid zero optional costs and rejects invalid spool weights', () => {
    expect(
      calculatePrintCost({
        ...input,
        machineHourlyCost: 0,
        labourHourlyCost: 0,
        labourHours: 0,
        extraPartsCost: 0,
        failureAllowancePercent: 0,
        marginPercent: 0,
      })?.totalCost,
    ).toBeCloseTo(1.96);
    expect(calculatePrintCost({ ...input, spoolWeightGrams: 0 })).toBeNull();
  });
  it('uses the electricity price entered by the user', () => {
    expect(
      calculatePrintCost({ ...input, electricityPrice: 0.41 })?.electricityCost,
    ).toBeCloseTo(0.492);
  });
});
