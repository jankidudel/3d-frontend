import { PlannerCurrency } from '../repeat-workflows/currency-preference';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import {
  calculatePrintPrice,
  type PrintPriceInputs,
} from '../print-price/print-price';

export const PREVIOUS_QUOTE_SCHEMA = 'inspectmesh-customer-quotation-v1';
export const QUOTE_SCHEMA = 'inspectmesh-customer-quotation-v2';
export const QUOTE_STORAGE_KEY = 'inspectmesh-customer-quotation-v1';
export const MAX_DRAFT_BYTES = 1024 * 1024;
export const MAX_LOGO_PIXELS = 4_000_000;
export const MAX_MONEY = 10_000_000_000;
export const MODEL_STATUS = 'Model reference not verified.';
export const TAX_NOTICE =
  'Tax is not calculated in this document. This is a quotation, not an invoice.';
export const ACCEPTANCE_NOTICE =
  'Customer acceptance is arranged directly with the print provider.';
export const DeliveryMode = {
  Included: 'included',
  Additional: 'additional',
} as const;
export type DeliveryMode = (typeof DeliveryMode)[keyof typeof DeliveryMode];
export const QuoteSource = {
  Manual: 'manual',
  Calculator: 'calculator',
  Example: 'example',
} as const;
export type QuoteSource = (typeof QuoteSource)[keyof typeof QuoteSource];
export interface QuoteHandoff {
  schemaVersion: 1;
  sourceRoute: typeof PublicRouteUrl.PrintPriceCalculator;
  timestamp: string;
  currency: PlannerCurrency;
  finalOrderPrice: number;
  quantity: number;
  reference: string;
  description: string;
  assumptions: PrintPriceInputs;
}
export interface QuoteLogo {
  dataUrl: string;
  width: number;
  height: number;
}
export const textLimits = {
  changeSummary: 2000,
  businessName: 200,
  businessEmail: 200,
  address: 1000,
  customerName: 200,
  customerEmail: 200,
  reference: 200,
  jobTitle: 200,
  material: 200,
  colour: 200,
  finish: 200,
  agreedScope: 5000,
  leadTime: 1000,
  deliveryScope: 1000,
  modelFilename: 200,
  revision: 200,
  units: 1000,
  reviewNotes: 5000,
  includedWork: 5000,
  exclusions: 5000,
  paymentInstructions: 5000,
} as const;
export type QuoteTextKey = keyof typeof textLimits;
export type QuoteText = Record<QuoteTextKey, string>;
export interface QuotationDraft extends QuoteText {
  schema: typeof QUOTE_SCHEMA;
  familyId: string;
  versionId: string;
  versionNumber: number;
  parentVersionId: string | null;
  parentVersionNumber: number | null;
  issueDate: string;
  validUntil: string;
  currency: PlannerCurrency;
  quantity: string;
  orderPrice: string;
  deliveryMode: DeliveryMode;
  deliveryAmount: string;
  source: QuoteSource;
  fictionalExample: boolean;
  reviewed: boolean;
  logo: QuoteLogo | null;
  internal: QuoteHandoff | null;
}
export interface QuoteIssue {
  field: string;
  message: string;
}
export function localCalendarDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function blankQuotation(date = localCalendarDay()): QuotationDraft {
  return {
    ...(Object.fromEntries(
      Object.keys(textLimits).map((key) => [key, '']),
    ) as QuoteText),
    schema: QUOTE_SCHEMA,
    familyId: crypto.randomUUID(),
    versionId: crypto.randomUUID(),
    versionNumber: 1,
    parentVersionId: null,
    parentVersionNumber: null,
    issueDate: date,
    validUntil: '',
    currency: PlannerCurrency.GBP,
    quantity: '1',
    orderPrice: '',
    deliveryMode: DeliveryMode.Included,
    deliveryAmount: '0',
    material: 'To be agreed',
    colour: 'To be agreed',
    finish: 'To be agreed',
    leadTime: 'To be agreed',
    source: QuoteSource.Manual,
    fictionalExample: false,
    reviewed: false,
    logo: null,
    internal: null,
  };
}
export function sampleQuotation(): QuotationDraft {
  return {
    ...blankQuotation(),
    businessName: 'Example Print Studio',
    customerName: 'Example Customer',
    reference: 'EXAMPLE-001',
    jobTitle: 'Five prototype spacers',
    quantity: '5',
    material: 'PLA',
    finish: 'Support removal',
    modelFilename: 'spacer-r2.stl',
    revision: 'r2',
    units: 'Millimetres, operator-declared',
    orderPrice: '60.30',
    agreedScope:
      'Five prototype spacers from the referenced model. One production run; design changes excluded.',
    source: QuoteSource.Example,
    fictionalExample: true,
  };
}
export function quotationFromPrice(offer: QuoteHandoff): QuotationDraft {
  return {
    ...blankQuotation(),
    source: QuoteSource.Calculator,
    internal: structuredClone(offer),
    currency: offer.currency,
    quantity: String(offer.quantity),
    reference: offer.reference,
    jobTitle: offer.description,
    orderPrice: (moneyCents(offer.finalOrderPrice)! / 100).toFixed(2),
  };
}
export function moneyValue(raw: string): number | null {
  if (raw.length > 40 || !/^\d+(?:\.\d+)?$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) && value <= MAX_MONEY ? value : null;
}
export function moneyCents(value: number): number | null {
  if (!Number.isFinite(value) || value < 0 || value > MAX_MONEY) {
    return null;
  }
  return Math.round((value + Number.EPSILON * Math.max(1, value)) * 100);
}
export function formatQuoteMoney(
  cents: number,
  currency: PlannerCurrency,
): string {
  return currency === PlannerCurrency.Other
    ? `${(cents / 100).toFixed(2)} (chosen currency)`
    : new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(cents / 100);
}
function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function quotationIssues(
  draft: QuotationDraft,
  final = false,
): QuoteIssue[] {
  const issues: QuoteIssue[] = [];
  for (const [field, limit] of Object.entries(textLimits)) {
    const text = draft[field as QuoteTextKey];
    if (
      typeof text !== 'string' ||
      text.length > limit ||
      Array.from(text).some(
        (character) =>
          character.charCodeAt(0) < 32 &&
          !['\t', '\n', '\r'].includes(character),
      )
    ) {
      issues.push({
        field,
        message: `Use plain text up to ${limit} characters.`,
      });
    }
  }
  if (final) {
    for (const field of [
      'businessName',
      'customerName',
      'reference',
      'jobTitle',
    ] as const) {
      if (!draft[field].trim()) {
        issues.push({
          field,
          message: 'Enter this detail before exporting the quotation.',
        });
      }
    }
  }
  for (const field of ['businessEmail', 'customerEmail'] as const) {
    if (draft[field] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft[field])) {
      issues.push({
        field,
        message: 'Enter a valid email address or leave it blank.',
      });
    }
  }
  if (!validDate(draft.issueDate)) {
    issues.push({ field: 'issueDate', message: 'Enter a valid issue date.' });
  }
  if (
    draft.validUntil &&
    (!validDate(draft.validUntil) || draft.validUntil < draft.issueDate)
  ) {
    issues.push({
      field: 'validUntil',
      message: 'Validity must be a valid date on or after the issue date.',
    });
  }
  if (!Object.values(PlannerCurrency).includes(draft.currency)) {
    issues.push({
      field: 'currency',
      message: 'Choose a supported two-decimal currency.',
    });
  }
  if (
    !/^\d+$/.test(draft.quantity) ||
    !Number.isSafeInteger(Number(draft.quantity)) ||
    Number(draft.quantity) < 1 ||
    Number(draft.quantity) > 100000
  ) {
    issues.push({
      field: 'quantity',
      message: 'Enter a whole-number quantity from 1 to 100,000.',
    });
  }
  const price = moneyValue(draft.orderPrice);
  if (
    (draft.orderPrice !== '' || final) &&
    (price === null || (final && moneyCents(price)! <= 0))
  ) {
    issues.push({
      field: 'orderPrice',
      message:
        'Enter a positive reviewed order selling price, using digits and a decimal point.',
    });
  }
  if (!Object.values(DeliveryMode).includes(draft.deliveryMode)) {
    issues.push({
      field: 'deliveryMode',
      message: 'Choose the delivery basis.',
    });
  }
  if (moneyValue(draft.deliveryAmount) === null) {
    issues.push({
      field: 'deliveryAmount',
      message:
        'Enter a finite non-negative delivery amount, using digits and a decimal point.',
    });
  }
  if (final && draft.versionNumber > 1 && !draft.changeSummary.trim()) {
    issues.push({
      field: 'changeSummary',
      message: 'Describe what changed before exporting a revised quotation.',
    });
  }
  if (final && !draft.reviewed) {
    issues.push({
      field: 'reviewed',
      message: 'Review this selling price and job scope before export.',
    });
  }
  return issues;
}
export function quotationCharges(
  draft: QuotationDraft,
): { orderCents: number; deliveryCents: number; totalCents: number } | null {
  const order = moneyValue(draft.orderPrice);
  const delivery = moneyValue(draft.deliveryAmount);
  if (
    order === null ||
    delivery === null ||
    !Object.values(DeliveryMode).includes(draft.deliveryMode)
  ) {
    return null;
  }
  const orderCents = moneyCents(order)!;
  const deliveryCents =
    draft.deliveryMode === DeliveryMode.Additional ? moneyCents(delivery)! : 0;
  return { orderCents, deliveryCents, totalCents: orderCents + deliveryCents };
}
// Explicit customer projection: internal handoff and edit metadata cannot reach preview or PDF.
export interface CustomerQuotation extends QuoteText {
  versionNumber: number;
  parentVersionNumber: number | null;
  issueDate: string;
  validUntil: string;
  currency: PlannerCurrency;
  quantity: number;
  modelStatus: typeof MODEL_STATUS;
  orderCents: number;
  deliveryMode: DeliveryMode;
  deliveryCents: number;
  totalCents: number;
  fictionalExample: boolean;
  logo: QuoteLogo | null;
  taxNotice: typeof TAX_NOTICE;
  acceptanceNotice: typeof ACCEPTANCE_NOTICE;
}
export function customerQuotation(
  draft: QuotationDraft,
): CustomerQuotation | null {
  if (quotationIssues(draft, true).length) {
    return null;
  }
  const charges = quotationCharges(draft)!;
  return {
    ...(Object.fromEntries(
      Object.keys(textLimits).map((key) => [key, draft[key as QuoteTextKey]]),
    ) as QuoteText),
    versionNumber: draft.versionNumber,
    parentVersionNumber: draft.parentVersionNumber,
    issueDate: draft.issueDate,
    validUntil: draft.validUntil,
    currency: draft.currency,
    quantity: Number(draft.quantity),
    modelStatus: MODEL_STATUS,
    ...charges,
    deliveryMode: draft.deliveryMode,
    fictionalExample: draft.fictionalExample,
    logo: draft.logo ? { ...draft.logo } : null,
    taxNotice: TAX_NOTICE,
    acceptanceNotice: ACCEPTANCE_NOTICE,
  };
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(
      'Choose an editable quotation draft downloaded from this tool.',
    );
  }
  return value as Record<string, unknown>;
}
export function validateHandoff(value: unknown): QuoteHandoff {
  const offer = record(value);
  const inputs = record(offer['assumptions']);
  const numericFields = [
    'materialPricePerKg',
    'materialUsedGrams',
    'wastePercent',
    'printHours',
    'printerWatts',
    'electricityPricePerKwh',
    'machineWearPerHour',
    'labourHours',
    'labourRate',
    'fixedOrderOverhead',
    'failurePercent',
    'quantity',
    'targetMarginPercent',
    'minimumOrderCharge',
  ] as const;
  if (
    numericFields.some(
      (key) =>
        typeof inputs[key] !== 'number' ||
        !Number.isFinite(inputs[key]) ||
        Number(inputs[key]) < 0,
    ) ||
    Object.entries(inputs).some(
      ([key, value]) =>
        !['productionBasis', 'pricingMethod', 'feesAlreadyInCost'].includes(
          key,
        ) &&
        (typeof value !== 'number' || !Number.isFinite(value) || value < 0),
    )
  ) {
    throw new Error('Invalid internal pricing assumptions.');
  }
  const result = calculatePrintPrice(inputs as unknown as PrintPriceInputs);
  if (
    !result ||
    !Number.isFinite(result.orderQuote) ||
    result.orderQuote !== offer['finalOrderPrice'] ||
    inputs['quantity'] !== offer['quantity']
  ) {
    throw new Error(
      'The historical pricing result does not match its assumptions.',
    );
  }
  if (
    offer['schemaVersion'] !== 1 ||
    offer['sourceRoute'] !== PublicRouteUrl.PrintPriceCalculator ||
    typeof offer['timestamp'] !== 'string' ||
    !Number.isFinite(Date.parse(offer['timestamp'])) ||
    !Object.values(PlannerCurrency).includes(
      offer['currency'] as PlannerCurrency,
    ) ||
    typeof offer['finalOrderPrice'] !== 'number' ||
    moneyCents(offer['finalOrderPrice']) === null ||
    offer['finalOrderPrice'] <= 0 ||
    !Number.isSafeInteger(offer['quantity']) ||
    Number(offer['quantity']) <= 0 ||
    Number(offer['quantity']) > 100000 ||
    typeof offer['reference'] !== 'string' ||
    offer['reference'].length > 200 ||
    typeof offer['description'] !== 'string' ||
    offer['description'].length > 200 ||
    !calculatePrintPrice(inputs as unknown as PrintPriceInputs)
  ) {
    throw new Error(
      'The saved pricing context is invalid. Return to the price calculator.',
    );
  }
  // Bound private context too; never pass it to analytics or document renderers.
  if (
    JSON.stringify(inputs).length > 20000 ||
    Object.values(inputs).some((v) => typeof v === 'object')
  ) {
    throw new Error('Invalid internal pricing assumptions.');
  }
  const allowedInputs = [
    ...numericFields,
    'jobProductionCost',
    'sellingFeePercent',
    'fixedSellingFee',
    'productionBasis',
    'pricingMethod',
    'feesAlreadyInCost',
  ];
  const assumptions = Object.fromEntries(
    allowedInputs
      .filter((key) => Object.hasOwn(inputs, key))
      .map((key) => [key, inputs[key]]),
  ) as unknown as PrintPriceInputs;
  return {
    schemaVersion: 1,
    sourceRoute: PublicRouteUrl.PrintPriceCalculator,
    timestamp: offer['timestamp'],
    currency: offer['currency'] as PlannerCurrency,
    finalOrderPrice: offer['finalOrderPrice'],
    quantity: Number(offer['quantity']),
    reference: offer['reference'],
    description: offer['description'],
    assumptions,
  } as QuoteHandoff;
}
export function parseQuotation(text: string, retained = false): QuotationDraft {
  if (new TextEncoder().encode(text).length > MAX_DRAFT_BYTES) {
    throw new Error('Draft files must be 1 MiB or smaller.');
  }
  const value = record(JSON.parse(text) as unknown);
  if (
    value['schema'] !== QUOTE_SCHEMA &&
    value['schema'] !== PREVIOUS_QUOTE_SCHEMA
  ) {
    throw new Error('Unsupported draft version');
  }
  const draft = blankQuotation();
  for (const field of Object.keys(textLimits) as QuoteTextKey[]) {
    if (
      field === 'changeSummary' &&
      value['schema'] === PREVIOUS_QUOTE_SCHEMA
    ) {
      continue;
    }
    if (typeof value[field] !== 'string') {
      throw new Error(`The draft is missing a valid ${field} field.`);
    }
    draft[field] = value[field];
  }
  for (const field of [
    'issueDate',
    'validUntil',
    'quantity',
    'orderPrice',
    'deliveryAmount',
  ] as const) {
    if (typeof value[field] !== 'string') {
      throw new Error(`The draft has an invalid ${field} field.`);
    }
    draft[field] = value[field];
  }
  if (value['schema'] === QUOTE_SCHEMA) {
    const id = (v: unknown): v is string =>
      typeof v === 'string' && /^[A-Za-z0-9-]{1,80}$/.test(v);
    if (
      !id(value['familyId']) ||
      !id(value['versionId']) ||
      !Number.isSafeInteger(value['versionNumber']) ||
      Number(value['versionNumber']) < 1 ||
      Number(value['versionNumber']) > 10 ||
      (value['versionNumber'] === 1
        ? value['parentVersionId'] !== null ||
          value['parentVersionNumber'] !== null
        : !id(value['parentVersionId']) ||
          !Number.isSafeInteger(value['parentVersionNumber']) ||
          Number(value['parentVersionNumber']) < 1 ||
          Number(value['parentVersionNumber']) >=
            Number(value['versionNumber']))
    ) {
      throw new Error('Invalid quotation version details.');
    }
    draft.familyId = value['familyId'];
    draft.versionId = value['versionId'];
    draft.versionNumber = Number(value['versionNumber']);
    draft.parentVersionId = value['parentVersionId'] as string | null;
    draft.parentVersionNumber = value['parentVersionNumber'] as number | null;
  }
  draft.currency = value['currency'] as PlannerCurrency;
  draft.deliveryMode = value['deliveryMode'] as DeliveryMode;
  if (
    !Object.values(QuoteSource).includes(value['source'] as QuoteSource) ||
    typeof value['fictionalExample'] !== 'boolean' ||
    typeof value['reviewed'] !== 'boolean'
  ) {
    throw new Error('The draft has invalid review or source details.');
  }
  draft.source = value['source'] as QuoteSource;
  draft.fictionalExample =
    value['fictionalExample'] || draft.source === QuoteSource.Example;
  // Reopened imported pricing always needs a fresh operator review.
  draft.reviewed = retained && value['reviewed'];
  draft.internal =
    value['internal'] === null ? null : validateHandoff(value['internal']);
  if (draft.source === QuoteSource.Calculator && !draft.internal) {
    throw new Error('An imported price needs its historical pricing context.');
  }
  if (value['logo'] !== null) {
    const logo = record(value['logo']);
    if (
      typeof logo['dataUrl'] !== 'string' ||
      !/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(
        logo['dataUrl'],
      ) ||
      !Number.isInteger(logo['width']) ||
      !Number.isInteger(logo['height']) ||
      Number(logo['width']) <= 0 ||
      Number(logo['height']) <= 0 ||
      Number(logo['width']) * Number(logo['height']) > MAX_LOGO_PIXELS
    ) {
      throw new Error(
        'The draft logo must be a valid PNG or JPEG within the pixel limit.',
      );
    }
    draft.logo = {
      dataUrl: logo['dataUrl'],
      width: Number(logo['width']),
      height: Number(logo['height']),
    };
  }
  const issues = quotationIssues(draft);
  if (issues.length) {
    throw new Error(issues[0].message);
  }
  return draft;
}
export function serializeQuotation(draft: QuotationDraft): string {
  const text = JSON.stringify(draft, null, 2);
  parseQuotation(text);
  return text;
}
export interface QuoteStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export function saveQuotation(
  storage: QuoteStorage,
  draft: QuotationDraft,
  now = new Date().toISOString(),
): string {
  const text = serializeQuotation(draft);
  // Only report success after the write completes. A failed write preserves the prior saved value.
  storage.setItem(
    QUOTE_STORAGE_KEY,
    JSON.stringify({
      schema: QUOTE_SCHEMA,
      savedAt: now,
      draft: JSON.parse(text) as unknown,
    }),
  );
  return now;
}
export function loadQuotation(
  storage: QuoteStorage,
): { draft: QuotationDraft; savedAt: string } | null {
  const text = storage.getItem(QUOTE_STORAGE_KEY);
  if (!text) {
    return null;
  }
  if (new TextEncoder().encode(text).length > MAX_DRAFT_BYTES + 1000) {
    throw new Error('The saved draft exceeds the size limit.');
  }
  const saved = record(JSON.parse(text) as unknown);
  if (
    (saved['schema'] !== QUOTE_SCHEMA &&
      saved['schema'] !== PREVIOUS_QUOTE_SCHEMA) ||
    typeof saved['savedAt'] !== 'string' ||
    !Number.isFinite(Date.parse(saved['savedAt']))
  ) {
    throw new Error('The saved quotation format is not supported.');
  }
  return {
    draft: parseQuotation(JSON.stringify(saved['draft'])),
    savedAt: saved['savedAt'],
  };
}
export function populatedQuotation(draft: QuotationDraft): boolean {
  const blank = blankQuotation(draft.issueDate);
  return (
    draft.logo !== null ||
    draft.internal !== null ||
    Object.keys(draft).some(
      (key) =>
        !['familyId', 'versionId'].includes(key) &&
        JSON.stringify(draft[key as keyof QuotationDraft]) !==
          JSON.stringify(blank[key as keyof QuotationDraft]),
    )
  );
}
