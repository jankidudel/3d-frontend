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
    packagingCost: 0.5,
    shippingCost: 3,
    failureAllowancePercent: 5,
    targetMarginPercent: 20,
    marketplaceFeePercent: 10,
    marketplaceFixedFee: 0.3,
    desiredSellingPrice: null,
    salesTaxPercent: 20,
  };
  it('calculates production, overhead, fees, profit and tax separately', () => {
    const result = calculatePrintCost(input);
    expect(result).toMatchObject({
      materialCost: 1.6,
      electricityCost: 0.36,
      machineCost: 2.5,
      labourCost: 5,
      extraPartsCost: 1,
      directProductionCost: 9.46,
      overheadCost: 4.5,
    });
    expect(result?.failureAllowance).toBeCloseTo(0.698);
    expect(result?.totalCost).toBeCloseTo(14.658);
    expect(result?.preFeeSellingPrice).toBeCloseTo(21.368571428571432);
    expect(result?.estimatedMarketplaceFees).toBeCloseTo(2.436857142857143);
    expect(result?.estimatedProfit).toBeCloseTo(4.273714285714288);
    expect(result?.salesTax).toBeCloseTo(4.273714285714287);
    expect(result?.customerQuotedPrice).toBeCloseTo(25.64228571428572);
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
        packagingCost: 0,
        shippingCost: 0,
        targetMarginPercent: 0,
        marketplaceFeePercent: 0,
        marketplaceFixedFee: 0,
        salesTaxPercent: 0,
      })?.totalCost,
    ).toBeCloseTo(1.96);
    expect(calculatePrintCost({ ...input, spoolWeightGrams: 0 })).toBeNull();
  });
  it('uses a desired price as the quote basis and reports its actual margin', () => {
    const result = calculatePrintCost({ ...input, desiredSellingPrice: 30 });

    expect(result?.preFeeSellingPrice).toBe(30);
    expect(result?.estimatedMarketplaceFees).toBeCloseTo(3.3);
    expect(result?.estimatedProfit).toBeCloseTo(12.042);
    expect(result?.marginPercent).toBeCloseTo(40.14, 2);
  });
  it('uses the electricity price entered by the user', () => {
    expect(
      calculatePrintCost({ ...input, electricityPrice: 0.41 })?.electricityCost,
    ).toBeCloseTo(0.492);
  });
});
