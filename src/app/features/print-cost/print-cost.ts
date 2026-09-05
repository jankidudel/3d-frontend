export const COST_CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'OTHER', label: 'Other' },
] as const;

export type CostCurrency = (typeof COST_CURRENCY_OPTIONS)[number]['value'];

export const DEFAULT_ELECTRICITY_PRICE_PER_KWH = 0.3;
export type CostMaterial = 'pla' | 'petg' | 'abs' | 'tpu' | 'custom';

export const MATERIAL_DENSITIES: Record<
  Exclude<CostMaterial, 'custom'>,
  number
> = {
  pla: 1.24,
  petg: 1.27,
  abs: 1.04,
  tpu: 1.21,
};
export interface PrintCostInputs {
  filamentWeightGrams: number;
  spoolWeightGrams: number;
  spoolPrice: number;
  printHours: number;
  printerWatts: number;
  electricityPrice: number;
  machineHourlyCost: number;
  labourHourlyCost: number;
  labourHours: number;
  extraPartsCost: number;
  failureAllowancePercent: number;
  marginPercent: number;
}
export interface PrintCostResult {
  materialCost: number;
  electricityCost: number;
  machineCost: number;
  labourCost: number;
  extraPartsCost: number;
  subtotal: number;
  failureAllowance: number;
  totalCost: number;
  suggestedSellingPrice: number | null;
}
export function calculatePrintCost(
  input: PrintCostInputs,
): PrintCostResult | null {
  const values = Object.values(input);
  if (
    values.some((value) => !Number.isFinite(value) || value < 0) ||
    input.spoolWeightGrams <= 0
  ) {
    return null;
  }
  const materialCost =
    (input.filamentWeightGrams / input.spoolWeightGrams) * input.spoolPrice;
  const electricityCost =
    (input.printerWatts / 1000) * input.printHours * input.electricityPrice;
  const machineCost = input.machineHourlyCost * input.printHours;
  const labourCost = input.labourHourlyCost * input.labourHours;
  const subtotal =
    materialCost +
    electricityCost +
    machineCost +
    labourCost +
    input.extraPartsCost;
  const failureAllowance = (subtotal * input.failureAllowancePercent) / 100;
  const totalCost = subtotal + failureAllowance;
  return {
    materialCost,
    electricityCost,
    machineCost,
    labourCost,
    extraPartsCost: input.extraPartsCost,
    subtotal,
    failureAllowance,
    totalCost,
    suggestedSellingPrice:
      input.marginPercent > 0
        ? totalCost * (1 + input.marginPercent / 100)
        : null,
  };
}
