export const COST_CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'CAD', label: 'CAD ($)' },
  { value: 'AUD', label: 'AUD ($)' },
  { value: 'NZD', label: 'NZD ($)' },
  { value: 'ZAR', label: 'ZAR (R)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'OTHER', label: 'Other' },
] as const;

export type CostCurrency = (typeof COST_CURRENCY_OPTIONS)[number]['value'];

export const DEFAULT_ELECTRICITY_PRICE_PER_KWH = 0.3;
import { materials, MaterialId } from '../materials/material-catalogue';
export type CostMaterial = MaterialId | 'custom';

export const MATERIAL_DENSITIES: Record<
  Exclude<CostMaterial, 'custom'>,
  number
> = Object.fromEntries(
  materials.map((material) => [material.id, material.density]),
) as Record<Exclude<CostMaterial, 'custom'>, number>;
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
  packagingCost: number;
  shippingCost: number;
  failureAllowancePercent: number;
  targetMarginPercent: number;
  marketplaceFeePercent: number;
  marketplaceFixedFee: number;
  desiredSellingPrice: number | null;
  salesTaxPercent: number;
}
export interface PrintCostResult {
  materialCost: number;
  electricityCost: number;
  machineCost: number;
  labourCost: number;
  extraPartsCost: number;
  packagingCost: number;
  shippingCost: number;
  directProductionCost: number;
  overheadCost: number;
  subtotal: number;
  failureAllowance: number;
  totalCost: number;
  preFeeSellingPrice: number;
  estimatedMarketplaceFees: number;
  customerQuotedPrice: number;
  salesTax: number;
  estimatedProfit: number;
  marginPercent: number;
  suggestedSellingPrice: number;
}
export function calculatePrintCost(
  input: PrintCostInputs,
): PrintCostResult | null {
  const values = Object.values(input).filter(
    (value): value is number => value !== null,
  );
  if (
    values.some((value) => !Number.isFinite(value) || value < 0) ||
    input.spoolWeightGrams <= 0 ||
    input.marketplaceFeePercent >= 100 ||
    input.targetMarginPercent + input.marketplaceFeePercent >= 100
  ) {
    return null;
  }
  const materialCost =
    (input.filamentWeightGrams / input.spoolWeightGrams) * input.spoolPrice;
  const electricityCost =
    (input.printerWatts / 1000) * input.printHours * input.electricityPrice;
  const machineCost = input.machineHourlyCost * input.printHours;
  const labourCost = input.labourHourlyCost * input.labourHours;
  const directProductionCost =
    materialCost + electricityCost + machineCost + labourCost;
  const overheadCost =
    input.extraPartsCost + input.packagingCost + input.shippingCost;
  const subtotal = directProductionCost + overheadCost;
  const failureAllowance = (subtotal * input.failureAllowancePercent) / 100;
  const totalCost = subtotal + failureAllowance;
  const preFeeSellingPrice =
    input.desiredSellingPrice ??
    (totalCost + input.marketplaceFixedFee) /
      (1 - input.marketplaceFeePercent / 100 - input.targetMarginPercent / 100);
  const estimatedMarketplaceFees =
    preFeeSellingPrice * (input.marketplaceFeePercent / 100) +
    input.marketplaceFixedFee;
  const estimatedProfit =
    preFeeSellingPrice - estimatedMarketplaceFees - totalCost;
  const salesTax = preFeeSellingPrice * (input.salesTaxPercent / 100);
  return {
    materialCost,
    electricityCost,
    machineCost,
    labourCost,
    extraPartsCost: input.extraPartsCost,
    packagingCost: input.packagingCost,
    shippingCost: input.shippingCost,
    directProductionCost,
    overheadCost,
    subtotal,
    failureAllowance,
    totalCost,
    preFeeSellingPrice,
    estimatedMarketplaceFees,
    customerQuotedPrice: preFeeSellingPrice + salesTax,
    salesTax,
    estimatedProfit,
    marginPercent:
      preFeeSellingPrice > 0 ? (estimatedProfit / preFeeSellingPrice) * 100 : 0,
    suggestedSellingPrice: preFeeSellingPrice,
  };
}
