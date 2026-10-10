import { describe, expect, it } from 'vitest';
import {
  blankJob,
  calculateJobCost,
  workedJob,
  MaterialBasis,
  jobRecord,
  jobRecordLines,
  MAX_JOB_PLATES,
} from './job-cost';
import {
  JobPlanningSession,
  PlanningDestination,
} from '../planning/job-planning-session';
import {
  calculatePrintPrice,
  ProductionBasis,
  PricingMethod,
  quoteWorksheet,
} from '../print-price/print-price';
const priceInput = {
  productionBasis: ProductionBasis.JobTotal,
  jobProductionCost: 39.192,
  pricingMethod: PricingMethod.Margin,
  materialPricePerKg: 0,
  materialUsedGrams: 0,
  wastePercent: 0,
  printHours: 0,
  printerWatts: 0,
  electricityPricePerKwh: 0,
  machineWearPerHour: 0,
  labourHours: 0,
  labourRate: 0,
  fixedOrderOverhead: 0,
  failurePercent: 0,
  quantity: 5,
  targetMarginPercent: 30,
  minimumOrderCharge: 0,
};
describe('explicit multi-plate job', () => {
  it('matches the independent worked totals with full precision and scope', () => {
    const r = calculateJobCost(workedJob())!;
    expect(r.material).toBeCloseTo(3.84, 10);
    expect(r.energy).toBeCloseTo(0.252, 10);
    expect(r.machine).toBe(14);
    expect(r.preparation).toBe(6);
    expect(r.handling).toBe(6);
    expect(r.finishing).toBe(7.5);
    expect(r.packaging).toBe(1.6);
    expect(r.total).toBeCloseTo(39.192, 10);
    expect(r.allocatedAverage).toBeCloseTo(7.8384, 10);
    expect(r.grams).toBe(160);
    expect(r.sequentialHours).toBe(7);
    expect(r.plannedQuantity).toBe(5);
  });
  it('repeats plate work and per-part finishing without repeating order work', () => {
    const i = workedJob();
    i.plates[0]!.repeats = 2;
    const r = calculateJobCost(i)!;
    expect(r.material).toBeCloseTo(6);
    expect(r.sequentialHours).toBe(11);
    expect(r.handling).toBe(9);
    expect(r.preparation).toBe(6);
    expect(r.finishing).toBe(12);
    expect(r.packaging).toBe(1.6);
    expect(r.plannedQuantity).toBe(8);
    expect(i.requestedQuantity).toBe(5);
  });
  it('weights actual material prices rather than silently averaging', () => {
    const i = workedJob();
    i.plates = [i.plates[0]!];
    i.plates[0]!.materials = [
      {
        label: 'A',
        grams: 60,
        additionalGrams: 0,
        spoolGrams: 1000,
        spoolPrice: 24,
        basis: MaterialBasis.Complete,
      },
      {
        label: 'B',
        grams: 40,
        additionalGrams: 0,
        spoolGrams: 500,
        spoolPrice: 20,
        basis: MaterialBasis.Complete,
      },
    ];
    const r = calculateJobCost(i)!;
    expect(r.material).toBeCloseTo(3.04, 10);
    expect(r.grams).toBe(100);
  });
  it('reconciles absent purge but rejects adding it to a complete total', () => {
    const i = workedJob();
    i.plates = [i.plates[0]!];
    const m = i.plates[0]!.materials[0]!;
    m.grams = 80;
    m.additionalGrams = 20;
    expect(calculateJobCost(i)).toBeNull();
    m.basis = MaterialBasis.Partial;
    expect(calculateJobCost(i)?.grams).toBe(100);
    m.basis = MaterialBasis.Complete;
    m.grams = 100;
    m.additionalGrams = 0;
    expect(calculateJobCost(i)?.grams).toBe(100);
  });
  it('uses overrides and suppresses energy if included in all machine rates', () => {
    const i = workedJob();
    i.plates[0]!.wattsOverride = 200;
    i.plates[0]!.machineRateOverride = 3;
    expect(calculateJobCost(i)?.energy).toBeCloseTo(0.348);
    expect(calculateJobCost(i)?.machine).toBe(18);
    i.machineIncludesEnergy = true;
    expect(calculateJobCost(i)?.energy).toBe(0);
  });
  it('keeps mixed allocation at order level and failure uplift financial only', () => {
    const i = workedJob();
    i.identicalParts = false;
    i.failurePercent = 10;
    const r = calculateJobCost(i)!;
    expect(r.allocatedAverage).toBeNull();
    expect(r.total).toBeCloseTo(43.1112);
    expect(r.grams).toBe(160);
    expect(r.sequentialHours).toBe(7);
  });
  it('rejects empty, incomplete, negative, nonfinite and invalid-repeat inputs', () => {
    expect(calculateJobCost(blankJob())).toBeNull();
    expect(calculateJobCost({ ...workedJob(), plates: [] })).toBeNull();
    expect(
      calculateJobCost({
        ...workedJob(),
        plates: Array.from(
          { length: MAX_JOB_PLATES + 1 },
          () => workedJob().plates[0]!,
        ),
      }),
    ).toBeNull();
    for (const value of [0, -1, 1.5, NaN, Infinity, 100001]) {
      const i = workedJob();
      i.plates[0]!.repeats = value;
      expect(calculateJobCost(i)).toBeNull();
    }
    for (const value of [-1, NaN, Infinity, Number.MAX_VALUE]) {
      expect(
        calculateJobCost({ ...workedJob(), preparationMinutes: value }),
      ).toBeNull();
    }
    const i = workedJob();
    i.plates[0]!.materials[0]!.spoolGrams = 0;
    expect(calculateJobCost(i)).toBeNull();
    i.plates[0]!.materials = [];
    expect(calculateJobCost(i)).toBeNull();
    expect(
      calculateJobCost({ ...workedJob(), requestedQuantity: 0 }),
    ).toBeNull();
  });
  it('allows legitimate zero costs with positive sliced duration and quantities', () => {
    const i = workedJob();
    i.machineRate = i.electricityRate = i.labourRate = i.packaging = 0;
    for (const p of i.plates) {
      p.materials[0]!.spoolPrice = 0;
    }
    expect(calculateJobCost(i)?.total).toBe(0);
  });
  it('exports the same result, full inputs and source basis without aliasing', () => {
    const i = workedJob();
    const record = jobRecord(i)!;
    expect(JSON.parse(JSON.stringify(record)).result.total).toBeCloseTo(
      39.192,
      10,
    );
    expect(record.result).toEqual(calculateJobCost(i));
    expect(jobRecordLines(record).join(' ')).toContain(
      '90 g + 0 additional g/run',
    );
    i.plates[0]!.materials[0]!.grams = 999;
    expect(record.inputs.plates[0]!.materials[0]!.grams).toBe(90);
  });
});
describe('production total pricing', () => {
  it('does not multiply K or apply production allowance again', () => {
    const p = calculatePrintPrice({
      ...priceInput,
      failurePercent: 90,
      fixedOrderOverhead: 999,
    })!;
    expect(p.productionCostForOrder).toBe(39.192);
    expect(p.orderQuote).toBeCloseTo(55.988571428571, 10);
    expect(
      calculatePrintPrice({ ...priceInput, quantity: 1 })?.orderQuote,
    ).toBeCloseTo(p.orderQuote);
  });
  it('matches margin and after-fee markup interpretations', () => {
    const margin = calculatePrintPrice({
      ...priceInput,
      sellingFeePercent: 5,
    })!;
    expect(margin.orderQuote).toBeCloseTo(60.29538461538, 10);
    expect(margin.realisedMarginPercent).toBeCloseTo(30, 10);
    const markup = calculatePrintPrice({
      ...priceInput,
      pricingMethod: PricingMethod.Markup,
      sellingFeePercent: 5,
      fixedSellingFee: 2,
    })!;
    expect(markup.orderQuote).toBeCloseTo((39.192 * 1.3 + 2) / 0.95, 10);
    expect(markup.grossProfitForOrder).toBeCloseTo(39.192 * 0.3, 10);
    expect(
      calculatePrintPrice({
        ...priceInput,
        pricingMethod: PricingMethod.Markup,
      })?.orderQuote,
    ).toBeCloseTo(50.9496, 10);
  });
  it('applies minimum last and recomputes fees and realised margin', () => {
    const p = calculatePrintPrice({
      ...priceInput,
      sellingFeePercent: 5,
      minimumOrderCharge: 65,
    })!;
    expect(p.orderQuote).toBe(65);
    expect(p.sellingFeesForOrder).toBe(3.25);
    expect(p.grossProfitForOrder).toBeCloseTo(22.558, 10);
    expect(p.realisedMarginPercent).toBeCloseTo(34.70461538461, 10);
  });
  it('rejects denominator limits, double-counted fees and invalid costs', () => {
    expect(
      calculatePrintPrice({ ...priceInput, sellingFeePercent: 70 }),
    ).toBeNull();
    expect(
      calculatePrintPrice({
        ...priceInput,
        pricingMethod: PricingMethod.Markup,
        sellingFeePercent: 100,
      }),
    ).toBeNull();
    expect(
      calculatePrintPrice({
        ...priceInput,
        feesAlreadyInCost: true,
        fixedSellingFee: 2,
      }),
    ).toBeNull();
    expect(
      calculatePrintPrice({
        ...priceInput,
        feesAlreadyInCost: true,
        sellingFeePercent: 5,
      }),
    ).toBeNull();
    expect(
      calculatePrintPrice({ ...priceInput, jobProductionCost: NaN }),
    ).toBeNull();
    expect(
      calculatePrintPrice({ ...priceInput, jobProductionCost: -1 }),
    ).toBeNull();
    expect(
      calculatePrintPrice({ ...priceInput, jobProductionCost: undefined }),
    ).toBeNull();
    expect(
      calculatePrintPrice({
        ...priceInput,
        pricingMethod: PricingMethod.Markup,
        targetMarginPercent: 200,
      }),
    ).not.toBeNull();
    expect(
      quoteWorksheet(priceInput, 'OTHER', 'test', '2026-10-10')
        ?.productionBasis,
    ).toBe(ProductionBasis.JobTotal);
  });
});
it('keeps offers isolated by destination, snapshots them and consumes once', () => {
  const s = new JobPlanningSession();
  const record = jobRecord(workedJob())!;
  s.jobDraft = workedJob();
  s.offer({
    destination: PlanningDestination.Price,
    value: 39.192,
    basis: 'complete total',
    record,
  });
  record.inputs.reference = 'changed';
  expect(s.take(PlanningDestination.Spool)).toBeNull();
  expect(s.take(PlanningDestination.Price)?.record?.inputs.reference).toBe(
    'Fictional five-part job',
  );
  expect(s.take(PlanningDestination.Price)).toBeNull();
  expect(s.jobDraft?.requestedQuantity).toBe(5);
});

it('job-total pricing ignores inactive per-item inputs, including invalid drafts', () => {
  expect(
    calculatePrintPrice({
      ...priceInput,
      materialUsedGrams: NaN,
      failurePercent: -1,
    })?.productionCostForOrder,
  ).toBe(39.192);
});
