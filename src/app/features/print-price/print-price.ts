export const PricingMethod = { Margin: 'margin', Markup: 'markup' } as const;
export type PricingMethod = (typeof PricingMethod)[keyof typeof PricingMethod];
export const ProductionBasis = {
  PerItem: 'per-item',
  JobTotal: 'job-total',
} as const;
export type ProductionBasis =
  (typeof ProductionBasis)[keyof typeof ProductionBasis];
export interface PrintPriceInputs {
  productionBasis?: ProductionBasis;
  jobProductionCost?: number;
  pricingMethod?: PricingMethod;
  sellingFeePercent?: number;
  fixedSellingFee?: number;
  feesAlreadyInCost?: boolean;
  materialPricePerKg: number;
  materialUsedGrams: number;
  wastePercent: number;
  printHours: number;
  printerWatts: number;
  electricityPricePerKwh: number;
  machineWearPerHour: number;
  labourHours: number;
  labourRate: number;
  fixedOrderOverhead: number;
  failurePercent: number;
  quantity: number;
  targetMarginPercent: number;
  minimumOrderCharge: number;
  finishingCostPerItem?: number;
  packagingPerOrder?: number;
  extraPerOrder?: number;
}

export interface PrintPriceResult {
  productionCostForOrder: number;
  sellingFeesForOrder: number;
  realisedMarginPercent: number;
  priceBeforeMinimum: number;
  materialCostPerItem: number;
  electricityCostPerItem: number;
  machineCostPerItem: number;
  labourCostPerItem: number;
  overheadPerItem: number;
  failureAllowancePerItem: number;
  trueCostPerItem: number;
  recommendedPricePerItem: number;
  orderQuote: number;
  grossProfitPerItem: number;
  grossProfitForOrder: number;
}

export function calculatePrintPrice(
  input: PrintPriceInputs,
): PrintPriceResult | null {
  if (
    (input.productionBasis === ProductionBasis.JobTotal
      ? [
          input.jobProductionCost,
          input.quantity,
          input.targetMarginPercent,
          input.minimumOrderCharge,
          input.sellingFeePercent ?? 0,
          input.fixedSellingFee ?? 0,
        ]
      : Object.values(input).filter(
          (value): value is number => typeof value === 'number',
        )
    ).some(
      (value) => value === undefined || !Number.isFinite(value) || value < 0,
    ) ||
    !Number.isInteger(input.quantity) ||
    input.quantity <= 0 ||
    ((input.pricingMethod ?? PricingMethod.Margin) === PricingMethod.Margin &&
      input.targetMarginPercent >= 100) ||
    !Object.values(PricingMethod).includes(
      input.pricingMethod ?? PricingMethod.Margin,
    ) ||
    !Object.values(ProductionBasis).includes(
      input.productionBasis ?? ProductionBasis.PerItem,
    ) ||
    (input.productionBasis === ProductionBasis.JobTotal &&
      input.jobProductionCost === undefined) ||
    (input.sellingFeePercent ?? 0) >= 100 ||
    (input.feesAlreadyInCost &&
      ((input.sellingFeePercent ?? 0) !== 0 ||
        (input.fixedSellingFee ?? 0) !== 0)) ||
    ((input.pricingMethod ?? PricingMethod.Margin) === PricingMethod.Margin &&
      input.targetMarginPercent + (input.sellingFeePercent ?? 0) >= 100)
  ) {
    return null;
  }
  const materialCostPerItem =
    (input.materialUsedGrams / 1000) *
    (1 + input.wastePercent / 100) *
    input.materialPricePerKg;
  const electricityCostPerItem =
    input.printHours *
    (input.printerWatts / 1000) *
    input.electricityPricePerKwh;
  const machineCostPerItem = input.printHours * input.machineWearPerHour;
  const labourCostPerItem =
    input.labourHours * input.labourRate + (input.finishingCostPerItem ?? 0);
  const overheadPerItem =
    (input.fixedOrderOverhead +
      (input.packagingPerOrder ?? 0) +
      (input.extraPerOrder ?? 0)) /
    input.quantity;
  const beforeFailure =
    materialCostPerItem +
    electricityCostPerItem +
    machineCostPerItem +
    labourCostPerItem +
    overheadPerItem;
  const jobMode = input.productionBasis === ProductionBasis.JobTotal;
  const trueCostPerItem = jobMode
    ? input.jobProductionCost! / input.quantity
    : beforeFailure * (1 + input.failurePercent / 100);
  const productionCostForOrder = jobMode
    ? input.jobProductionCost!
    : trueCostPerItem * input.quantity;
  const f = (input.sellingFeePercent ?? 0) / 100;
  const fixed = input.fixedSellingFee ?? 0;
  const percentage = input.targetMarginPercent / 100;
  const priceBeforeMinimum =
    (input.pricingMethod ?? PricingMethod.Margin) === PricingMethod.Margin
      ? (productionCostForOrder + fixed) / (1 - percentage - f)
      : (productionCostForOrder * (1 + percentage) + fixed) / (1 - f);
  const orderQuote = Math.max(priceBeforeMinimum, input.minimumOrderCharge);
  const sellingFeesForOrder = orderQuote * f + fixed;
  const grossProfitForOrder =
    orderQuote - sellingFeesForOrder - productionCostForOrder;
  const recommendedPricePerItem = orderQuote / input.quantity;
  const result = {
    productionCostForOrder,
    sellingFeesForOrder,
    realisedMarginPercent:
      orderQuote > 0 ? (grossProfitForOrder / orderQuote) * 100 : 0,
    priceBeforeMinimum,
    materialCostPerItem: jobMode ? 0 : materialCostPerItem,
    electricityCostPerItem: jobMode ? 0 : electricityCostPerItem,
    machineCostPerItem: jobMode ? 0 : machineCostPerItem,
    labourCostPerItem: jobMode ? 0 : labourCostPerItem,
    overheadPerItem: jobMode ? 0 : overheadPerItem,
    failureAllowancePerItem: jobMode ? 0 : trueCostPerItem - beforeFailure,
    trueCostPerItem,
    recommendedPricePerItem,
    orderQuote,
    grossProfitPerItem: grossProfitForOrder / input.quantity,
    grossProfitForOrder,
  };
  return Object.values(result).every(Number.isFinite) ? result : null;
}

export function quoteWorksheet(
  input: PrintPriceInputs,
  currency: string,
  reference: string,
  date: string,
) {
  const result = calculatePrintPrice(input);
  if (!result) {
    return null;
  }
  return {
    schema: 'inspectmesh-quote-1',
    reference,
    date,
    currency,
    inputs: input,
    result,
    mode: input.pricingMethod ?? PricingMethod.Margin,
    productionBasis: input.productionBasis ?? ProductionBasis.PerItem,
    sellingFees:
      'User-entered percentage of this selling price plus fixed fee once per order. No marketplace tax/shipping fee model. Fees marked as included in cost require zero separate fee inputs.',
    rounding:
      'JSON retains full precision. The interface displays money to two decimal places; copy/printable text records can show up to six decimal places for reconciliation. Rounded unit price times quantity may differ from rounded order total.',
    allowances:
      'Per-item mode: setup, packaging and extras once per order; failure uplift on all costs. Job-total mode: entered K is complete production cost, with no quantity multiplication or further uplift. Markup targets profit u times K after entered fees. Minimum charge applied last; realised margin is recomputed.',
    exclusions:
      'Tax and any unentered delivery/work/fees. Currency selection relabels values without exchange conversion.',
    purpose:
      'Estimate worksheet, not a tax-compliant invoice or unconditional production acceptance.',
  };
}

/** Render the existing worksheet result; never independently recompute pricing. */
export function quoteWorksheetLines(
  worksheet: NonNullable<ReturnType<typeof quoteWorksheet>>,
): string[] {
  const i = worksheet.inputs;
  const r = worksheet.result;
  const display = (value: number) =>
    new Intl.NumberFormat('en', { maximumFractionDigits: 6 }).format(value);
  const lines = [
    `InspectMesh quote estimate: ${worksheet.reference || 'No reference'}`,
    `Date ${worksheet.date}; currency ${worksheet.currency}; planned quantity ${i.quantity}`,
    `Production basis: ${worksheet.productionBasis}; K for order ${display(r.productionCostForOrder)}`,
    `Pricing method: ${worksheet.mode}; target percentage ${i.targetMarginPercent}%`,
    `Fees: ${i.sellingFeePercent ?? 0}% of selling price P; fixed ${i.fixedSellingFee ?? 0} once per order; already in K: ${i.feesAlreadyInCost ?? false}`,
    worksheet.mode === PricingMethod.Margin
      ? 'P = (K + F) / (1 - m - f)'
      : 'P = (K * (1 + u) + F) / (1 - f); profit target u * K after fees',
    `Price before minimum ${display(r.priceBeforeMinimum)}; minimum ${i.minimumOrderCharge}; order quote ${display(r.orderQuote)}`,
    `Selling fees ${display(r.sellingFeesForOrder)}; profit ${display(r.grossProfitForOrder)}; realised margin ${display(r.realisedMarginPercent)}%`,
  ];
  if (worksheet.productionBasis === ProductionBasis.PerItem) {
    lines.push(
      `Per item: ${i.materialUsedGrams} g at ${i.materialPricePerKg}/kg; additional material ${i.wastePercent}%; ${i.printHours} h; ${i.printerWatts} W; electricity ${i.electricityPricePerKwh}/kWh`,
      `Machine ${i.machineWearPerHour}/h; active labour ${i.labourHours} h at ${i.labourRate}/h; finishing ${i.finishingCostPerItem ?? 0}/part`,
      `Once per order: setup ${i.fixedOrderOverhead}; packaging ${i.packagingPerOrder ?? 0}; extras ${i.extraPerOrder ?? 0}; failure uplift ${i.failurePercent}% on all costs`,
    );
  }
  lines.push(
    worksheet.sellingFees,
    worksheet.allowances,
    worksheet.rounding,
    worksheet.exclusions,
    worksheet.purpose,
  );
  return lines;
}
