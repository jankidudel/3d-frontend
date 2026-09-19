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
  const labourCostPerItem = input.labourHours * input.labourRate;
  const overheadPerItem = input.fixedOrderOverhead / input.quantity;
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
  return {
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
}
