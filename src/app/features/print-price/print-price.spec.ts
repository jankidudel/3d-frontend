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
