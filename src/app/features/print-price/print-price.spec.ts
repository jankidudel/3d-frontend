import { describe, expect, it } from 'vitest';
import { calculatePrintPrice } from './print-price';
const input = {
  materialPricePerKg: 20,
  materialUsedGrams: 80,
  wastePercent: 5,
  printHours: 4,
  printerWatts: 120,
  electricityPricePerKwh: 0.16,
  machineWearPerHour: 0.25,
  labourHours: 0.25,
  labourRate: 20,
  fixedOrderOverhead: 2,
  failurePercent: 10,
  quantity: 2,
  targetMarginPercent: 30,
  minimumOrderCharge: 0,
};
describe('calculatePrintPrice', () => {
  it('spreads fixed overhead and calculates margin-based price', () => {
    const result = calculatePrintPrice(input);
    expect(result?.overheadPerItem).toBe(1);
    expect(result?.recommendedPricePerItem).toBeCloseTo(13.76, 1);
    expect(result?.orderQuote).toBeCloseTo(result!.recommendedPricePerItem * 2);
  });
  it('rejects zero quantity and a 100% margin', () => {
    expect(calculatePrintPrice({ ...input, quantity: 0 })).toBeNull();
    expect(
      calculatePrintPrice({ ...input, targetMarginPercent: 100 }),
    ).toBeNull();
  });
});

it('matches one and five-part hand calculations with shared setup', () => {
  const base = {
    ...input,
    materialUsedGrams: 100,
    wastePercent: 0,
    printHours: 0,
    labourHours: 0,
    fixedOrderOverhead: 10,
    failurePercent: 0,
    targetMarginPercent: 20,
  };
  expect(calculatePrintPrice({ ...base, quantity: 1 })?.orderQuote).toBe(15);
  const five = calculatePrintPrice({ ...base, quantity: 5 });
  expect(five?.overheadPerItem).toBe(2);
  expect(five?.recommendedPricePerItem).toBe(5);
  expect(five?.orderQuote).toBe(25);
});
it('rejects fractional quantity, negative/nonfinite inputs and overflow but permits zero costs', () => {
  for (const value of [NaN, Infinity, -1]) {
    expect(
      calculatePrintPrice({ ...input, materialPricePerKg: value }),
    ).toBeNull();
  }
  expect(calculatePrintPrice({ ...input, quantity: 1.5 })).toBeNull();
  expect(
    calculatePrintPrice({
      ...input,
      materialUsedGrams: Number.MAX_VALUE,
      materialPricePerKg: Number.MAX_VALUE,
    }),
  ).toBeNull();
  const zero = Object.fromEntries(
    Object.keys(input).map((key) => [key, 0]),
  ) as typeof input;
  expect(calculatePrintPrice({ ...zero, quantity: 1 })?.orderQuote).toBe(0);
});
