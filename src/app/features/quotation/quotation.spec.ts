import { describe, expect, it } from 'vitest';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { PlannerCurrency } from '../repeat-workflows/currency-preference';
import {
  calculatePrintPrice,
  PricingMethod,
  ProductionBasis,
  type PrintPriceInputs,
} from '../print-price/print-price';
import {
  DeliveryMode,
  MAX_DRAFT_BYTES,
  QuoteSource,
  blankQuotation,
  customerQuotation,
  localCalendarDay,
  moneyCents,
  moneyValue,
  parseQuotation,
  quotationFromPrice,
  quotationIssues,
  sampleQuotation,
  saveQuotation,
  serializeQuotation,
  loadQuotation,
  validateHandoff,
  type QuoteHandoff,
} from './quotation';

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
describe('customer quotations', () => {
  it('uses the local calendar day rather than UTC date serialization', () => {
    const date = new Date(2026, 9, 20, 0, 1);
    expect(localCalendarDay(date)).toBe('2026-10-20');
  });
  it('imports a full precision job price once and requires fresh scope review', () => {
    const offer = quotationOffer();
    const draft = quotationFromPrice(offer);
    expect(offer.finalOrderPrice).toBeCloseTo(60.29538461538, 9);
    expect(draft.orderPrice).toBe('60.30');
    expect(draft.quantity).toBe('5');
    expect(
      quotationIssues(draft, true).some((issue) => issue.field === 'reviewed'),
    ).toBe(true);
    expect(quotationFromPrice(quotationOffer(65)).orderPrice).toBe('65.00');
    draft.internal!.assumptions.jobProductionCost = 999;
    expect(offer.assumptions.jobProductionCost).toBe(39.192);
  });
  it('adds rounded customer delivery once and never multiplies the quantity', () => {
    const draft = {
      ...sampleQuotation(),
      deliveryMode: DeliveryMode.Additional,
      deliveryAmount: '4.50',
    };
    const document = customerQuotation(draft)!;
    expect(document.orderCents).toBe(6030);
    expect(document.deliveryCents).toBe(450);
    expect(document.totalCents).toBe(6480);
    expect(
      customerQuotation({ ...draft, deliveryMode: DeliveryMode.Included })!
        .totalCents,
    ).toBe(6030);
    expect(moneyCents(1.005)).toBe(101);
  });
  it.each(['NaN', 'Infinity', '-1', '1e3', '12oops', '1,234', ' ', '.'])(
    'rejects malformed money %s',
    (value) => {
      expect(moneyValue(value)).toBeNull();
      expect(
        customerQuotation({ ...sampleQuotation(), orderPrice: value }),
      ).toBeNull();
    },
  );
  it('does not export zero prices or invalid quantities and expiry', () => {
    expect(
      customerQuotation({ ...sampleQuotation(), orderPrice: '0' }),
    ).toBeNull();
    for (const quantity of ['0', '-1', '1.5', 'NaN', '100001']) {
      expect(customerQuotation({ ...sampleQuotation(), quantity })).toBeNull();
    }
    expect(
      customerQuotation({ ...sampleQuotation(), issueDate: '2026-02-30' }),
    ).toBeNull();
    expect(
      customerQuotation({
        ...sampleQuotation(),
        issueDate: '2026-10-20',
        validUntil: '2026-10-19',
      }),
    ).toBeNull();
  });
  it('projects only the public document fields and preserves sample designation', () => {
    const draft = {
      ...sampleQuotation(),
      internal: quotationOffer(),
      source: QuoteSource.Calculator,
      reviewed: true,
    };
    const document = customerQuotation(draft)!;
    const json = JSON.stringify(document);
    for (const privateKey of [
      'internal',
      'assumptions',
      'sourceRoute',
      'timestamp',
      'schemaVersion',
      'productionCost',
      'sellingFee',
      'margin',
      'machineWear',
      'reviewed',
    ]) {
      expect(json).not.toContain(privateKey);
    }
    expect(document.fictionalExample).toBe(true);
    expect(document.modelStatus).toBe('Model reference not verified.');
  });
  it('round trips editable drafts, preserves private precision and resets imported review', () => {
    const original = {
      ...sampleQuotation(),
      internal: quotationOffer(),
      source: QuoteSource.Calculator,
      reviewed: true,
    };
    const restored = parseQuotation(serializeQuotation(original));
    expect(restored.internal?.finalOrderPrice).toBe(
      original.internal.finalOrderPrice,
    );
    expect(restored.reviewed).toBe(false);
    expect(restored.fictionalExample).toBe(true);
    expect(
      parseQuotation(serializeQuotation(blankQuotation())).businessName,
    ).toBe('');
  });
  it('rejects unsupported, oversized, malformed and overlong imports', () => {
    expect(() => parseQuotation('{')).toThrow();
    expect(() =>
      parseQuotation(
        JSON.stringify({ ...sampleQuotation(), schema: 'inspectmesh-quote-1' }),
      ),
    ).toThrow(/version/);
    expect(() => parseQuotation(' '.repeat(MAX_DRAFT_BYTES + 1))).toThrow(
      /1 MiB/,
    );
    expect(() =>
      parseQuotation(
        JSON.stringify({ ...sampleQuotation(), businessName: 'a'.repeat(201) }),
      ),
    ).toThrow();
    expect(() =>
      parseQuotation(
        JSON.stringify({ ...sampleQuotation(), customerName: null }),
      ),
    ).toThrow();
    expect(() =>
      parseQuotation(JSON.stringify({ ...sampleQuotation(), currency: 'JPY' })),
    ).toThrow();
    expect(() =>
      parseQuotation(
        JSON.stringify({
          ...sampleQuotation(),
          logo: {
            dataUrl: 'https://example.com/logo.png',
            width: 1,
            height: 1,
          },
        }),
      ),
    ).toThrow();
    expect(() =>
      validateHandoff({ ...quotationOffer(), assumptions: { quantity: 5 } }),
    ).toThrow();
    expect(() =>
      validateHandoff({ ...quotationOffer(), finalOrderPrice: 1 }),
    ).toThrow();
  });
  it('keeps text inert rather than evaluating imported markup', () => {
    const text = '<img src=x onerror=alert(1)> & <script>fail()</script>';
    const draft = parseQuotation(
      serializeQuotation({ ...sampleQuotation(), reviewNotes: text }),
    );
    expect(customerQuotation(draft)?.reviewNotes).toBe(text);
  });
  it('does not claim a failed storage write succeeded or replace earlier saved state', () => {
    let previous = 'prior saved draft';
    const storage = {
      getItem: () => previous,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        previous = '';
      },
    };
    const draft = sampleQuotation();
    const original = structuredClone(draft);
    expect(() => saveQuotation(storage, draft)).toThrow('quota');
    expect(previous).toBe('prior saved draft');
    expect(draft).toEqual(original);
  });
  it('saves only on explicit call and reopens the versioned saved date and draft', () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
    };
    expect(loadQuotation(storage)).toBeNull();
    const when = saveQuotation(
      storage,
      sampleQuotation(),
      '2026-10-20T12:00:00Z',
    );
    expect(loadQuotation(storage)?.savedAt).toBe(when);
    expect(loadQuotation(storage)?.draft.fictionalExample).toBe(true);
  });
});
