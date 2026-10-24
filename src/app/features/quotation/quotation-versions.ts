import {
  blankQuotation,
  customerQuotation,
  MAX_DRAFT_BYTES,
  parseQuotation,
  quotationIssues,
  serializeQuotation,
  type CustomerQuotation,
  type QuotationDraft,
  type QuoteStorage,
} from './quotation';

export const ARCHIVE_SCHEMA = 'inspectmesh-quotation-archive-v1';
export const FAMILY_STORAGE_KEY = 'inspectmesh-quotation-family-v1';
export const MAX_FAMILY_BYTES = 4 * MAX_DRAFT_BYTES;
export const MAX_VERSIONS = 10;
export interface RetainedQuotation {
  recordedAt: string;
  draft: QuotationDraft;
  customer: CustomerQuotation;
}
export interface QuotationFamily {
  schema: typeof ARCHIVE_SCHEMA;
  familyId: string;
  rootVersionId: string;
  current: QuotationDraft;
  versions: RetainedQuotation[];
}
export function quotationFamily(current = blankQuotation()): QuotationFamily {
  return {
    schema: ARCHIVE_SCHEMA,
    familyId: current.familyId,
    rootVersionId: current.versionId,
    current: structuredClone(current),
    versions: [],
  };
}
function bounded(family: QuotationFamily): QuotationFamily {
  if (
    family.versions.length > MAX_VERSIONS ||
    new TextEncoder().encode(JSON.stringify(family)).length > MAX_FAMILY_BYTES
  ) {
    throw new Error(
      'Quotation versions must fit within ten versions and 4 MiB. Download quotation archive to keep your records; no versions were removed.',
    );
  }
  return family;
}
export function keepQuotation(
  family: QuotationFamily,
  current: QuotationDraft,
  now = new Date().toISOString(),
): QuotationFamily {
  const customer = customerQuotation(current);
  if (!customer) {
    throw new Error(
      quotationIssues(current, true)[0]?.message ??
        'Review the quotation first.',
    );
  }
  serializeQuotation(current);
  if (family.familyId !== current.familyId) {
    throw new Error('This quotation belongs to a different family.');
  }
  const previous = family.versions.find(
    (version) => version.draft.versionId === current.versionId,
  );
  if (previous) {
    if (
      JSON.stringify(previous.customer) !== JSON.stringify(customer) ||
      JSON.stringify(previous.draft.internal) !==
        JSON.stringify(current.internal)
    ) {
      throw new Error(
        'This version is already retained. Create a revised quotation to keep changes separately.',
      );
    }
    return bounded({
      ...structuredClone(family),
      current: structuredClone(current),
    });
  }
  return bounded({
    ...structuredClone(family),
    current: structuredClone(current),
    versions: [
      ...structuredClone(family.versions),
      { recordedAt: now, draft: structuredClone(current), customer },
    ],
  });
}
export function reviseQuotation(
  family: QuotationFamily,
  current: QuotationDraft,
): QuotationFamily {
  // Retained parents remain immutable even when the live editor has subsequent changes.
  const parent = family.versions.find(
    (version) => version.draft.versionId === current.versionId,
  );
  const next = parent
    ? structuredClone(family)
    : keepQuotation(family, current);
  const largest = Math.max(
    current.versionNumber,
    ...next.versions.map((version) => version.draft.versionNumber),
  );
  if (largest >= MAX_VERSIONS) {
    throw new Error(
      'Ten quotation versions are already allocated. Download quotation archive; no versions were removed.',
    );
  }
  next.current = {
    ...structuredClone(current),
    versionId: crypto.randomUUID(),
    versionNumber: largest + 1,
    parentVersionId: current.versionId,
    parentVersionNumber: current.versionNumber,
    changeSummary: '',
    reviewed: false,
  };
  serializeQuotation(next.current);
  return bounded(next);
}
export function parseArchive(text: string): QuotationFamily {
  if (new TextEncoder().encode(text).length > MAX_FAMILY_BYTES) {
    throw new Error('Quotation archives must be 4 MiB or smaller.');
  }
  const value = JSON.parse(text) as QuotationFamily;
  if (
    !value ||
    value.schema !== ARCHIVE_SCHEMA ||
    !Array.isArray(value.versions) ||
    value.versions.length > MAX_VERSIONS
  ) {
    throw new Error('Unsupported quotation archive version or version count.');
  }
  const current = parseQuotation(JSON.stringify(value.current));
  if (value.familyId !== current.familyId) {
    throw new Error('Cross-family quotation link.');
  }
  const ids = new Map<string, QuotationDraft>();
  const numbers = new Set<number>();
  const versions = value.versions.map((item) => {
    if (
      !item ||
      typeof item.recordedAt !== 'string' ||
      !Number.isFinite(Date.parse(item.recordedAt))
    ) {
      throw new Error('Invalid retained timestamp.');
    }
    const draft = parseQuotation(JSON.stringify(item.draft), true);
    const customer = customerQuotation(draft);
    if (
      !customer ||
      draft.familyId !== current.familyId ||
      ids.has(draft.versionId) ||
      numbers.has(draft.versionNumber)
    ) {
      throw new Error('Invalid, duplicate or cross-family retained version.');
    }
    ids.set(draft.versionId, draft);
    numbers.add(draft.versionNumber);
    // Reconstruct the public snapshot rather than trusting imported projections.
    return { recordedAt: item.recordedAt, draft, customer };
  });
  const same = ids.get(current.versionId);
  if (
    same &&
    (same.versionNumber !== current.versionNumber ||
      same.parentVersionId !== current.parentVersionId ||
      same.parentVersionNumber !== current.parentVersionNumber)
  ) {
    throw new Error('Inconsistent current version identity.');
  }
  if (!same && numbers.has(current.versionNumber)) {
    throw new Error('Repeated version number.');
  }
  const rootVersionId =
    value.rootVersionId ??
    versions.find((version) => version.draft.versionNumber === 1)?.draft
      .versionId ??
    (current.versionNumber === 1 ? current.versionId : null);
  const root =
    rootVersionId === current.versionId
      ? current
      : ids.get(rootVersionId ?? '');
  if (
    !root ||
    [...versions.map((version) => version.draft), current].some(
      (draft) => draft.versionNumber < root.versionNumber,
    )
  ) {
    throw new Error('Invalid archive history root.');
  }
  for (const draft of [...versions.map((version) => version.draft), current]) {
    if (draft.parentVersionId) {
      const parent = ids.get(draft.parentVersionId);
      if (
        parent
          ? parent.versionNumber !== draft.parentVersionNumber ||
            parent.versionNumber >= draft.versionNumber
          : draft.versionId !== rootVersionId ||
            draft.parentVersionId === rootVersionId
      ) {
        throw new Error('Invalid or cyclic parent reference.');
      }
    }
  }
  return bounded({
    schema: ARCHIVE_SCHEMA,
    familyId: current.familyId,
    rootVersionId: root.versionId,
    current,
    versions,
  });
}
export function serializeArchive(
  family: QuotationFamily,
  current: QuotationDraft,
): string {
  const next = bounded({ ...family, current: structuredClone(current) });
  const text = JSON.stringify(next);
  parseArchive(text);
  return text;
}
export function saveFamily(
  storage: QuoteStorage,
  family: QuotationFamily,
  current: QuotationDraft,
): void {
  storage.setItem(FAMILY_STORAGE_KEY, serializeArchive(family, current));
}
export function quotationPdfFilename(
  reference: string,
  version: number,
): string {
  const basename = reference
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${basename || 'quotation'}-v${version}.pdf`;
}
