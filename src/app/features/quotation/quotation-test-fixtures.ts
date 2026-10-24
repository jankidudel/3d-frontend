import { PublicRouteUrl } from '../../core/seo/public-routes';
import { PlannerCurrency } from '../repeat-workflows/currency-preference';
import {
  calculatePrintPrice,
  PricingMethod,
  ProductionBasis,
  type PrintPriceInputs,
} from '../print-price/print-price';
import type { QuoteHandoff } from './quotation';

export function quotationPricingInput(minimum = 0): PrintPriceInputs {
  return {
    productionBasis: ProductionBasis.JobTotal,
    jobProductionCost: 39.192,
    pricingMethod: PricingMethod.Margin,
    sellingFeePercent: 5,
    fixedSellingFee: 0,
    feesAlreadyInCost: false,
    materialPricePerKg: 20,
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
    minimumOrderCharge: minimum,
  };
}
export function quotationOffer(minimum = 0): QuoteHandoff {
  const assumptions = quotationPricingInput(minimum);
  return {
    schemaVersion: 1,
    sourceRoute: PublicRouteUrl.PrintPriceCalculator,
    timestamp: '2026-10-20T12:00:00Z',
    currency: PlannerCurrency.GBP,
    finalOrderPrice: calculatePrintPrice(assumptions)!.orderQuote,
    quantity: 5,
    reference: 'QUOTE-1',
    description: 'Five spacers',
    assumptions,
  };
}
