const CURRENCY_KEY = 'inspectmesh-calculator-currency-v1';
export const PlannerCurrency = {
  GBP: 'GBP',
  USD: 'USD',
  CAD: 'CAD',
  AUD: 'AUD',
  NZD: 'NZD',
  EUR: 'EUR',
  ZAR: 'ZAR',
  Other: 'OTHER',
} as const;
export type PlannerCurrency =
  (typeof PlannerCurrency)[keyof typeof PlannerCurrency];
export function chosenCurrency(): PlannerCurrency {
  try {
    const value = localStorage.getItem(CURRENCY_KEY);
    return (
      Object.values(PlannerCurrency).find((currency) => currency === value) ??
      PlannerCurrency.GBP
    );
  } catch {
    return PlannerCurrency.GBP;
  }
}
export function rememberCurrency(value: string): void {
  try {
    localStorage.setItem(CURRENCY_KEY, value);
  } catch {
    /* The calculation remains usable without storage. */
  }
}
