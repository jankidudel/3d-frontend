export interface PrintPriceInputs {
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
    Object.values(input).some(
      (value) => !Number.isFinite(value) || value < 0,
    ) ||
    !Number.isInteger(input.quantity) ||
    input.quantity <= 0 ||
    input.targetMarginPercent >= 100
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
  const trueCostPerItem = beforeFailure * (1 + input.failurePercent / 100);
  const priceFromMargin =
    trueCostPerItem / (1 - input.targetMarginPercent / 100);
  const recommendedPricePerItem = Math.max(
    priceFromMargin,
    input.minimumOrderCharge / input.quantity,
  );
  const grossProfitPerItem = recommendedPricePerItem - trueCostPerItem;
  const result = {
    materialCostPerItem,
    electricityCostPerItem,
    machineCostPerItem,
    labourCostPerItem,
    overheadPerItem,
    failureAllowancePerItem: trueCostPerItem - beforeFailure,
    trueCostPerItem,
    recommendedPricePerItem,
    orderQuote: recommendedPricePerItem * input.quantity,
    grossProfitPerItem,
    grossProfitForOrder: grossProfitPerItem * input.quantity,
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
    mode: 'margin',
    sellingFees: 'Not included; no selling-fee model is implemented.',
    rounding:
      'Calculate with full precision; display each monetary value to two decimal places. Displayed rounded unit price times quantity may differ from displayed order total.',
    allowances:
      'Setup, packaging and extras are once per order and spread over quantity. Failure allowance applies to all entered costs; set it to zero if already included in rates.',
    exclusions:
      'Tax, delivery, selling fees and any unentered costs. Currency selection relabels values without exchange conversion.',
    purpose:
      'Estimate worksheet, not a tax-compliant invoice or unconditional production acceptance.',
  };
}
