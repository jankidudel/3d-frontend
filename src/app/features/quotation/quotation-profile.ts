import {
  blankQuotation,
  MAX_DRAFT_BYTES,
  parseQuotation,
  type QuotationDraft,
  type QuoteLogo,
  type QuoteStorage,
} from './quotation';

export const PROFILE_SCHEMA = 'inspectmesh-business-profile-v1';
export const PROFILE_STORAGE_KEY = 'inspectmesh-business-profile-v1';
export const profileFields = [
  'businessName',
  'businessEmail',
  'address',
  'paymentInstructions',
  'logo',
] as const;
export type BusinessDetails = Pick<
  QuotationDraft,
  (typeof profileFields)[number]
>;
export interface BusinessProfile extends BusinessDetails {
  schema: typeof PROFILE_SCHEMA;
  savedAt: string;
}
function details(draft: BusinessDetails): BusinessDetails {
  return {
    businessName: draft.businessName,
    businessEmail: draft.businessEmail,
    address: draft.address,
    paymentInstructions: draft.paymentInstructions,
    logo: draft.logo ? structuredClone(draft.logo) : null,
  };
}
export function parseProfile(text: string): BusinessProfile {
  if (new TextEncoder().encode(text).length > MAX_DRAFT_BYTES) {
    throw new Error(
      'Business profiles must be 1 MiB or smaller, including the logo.',
    );
  }
  const value = JSON.parse(text) as BusinessProfile;
  if (
    !value ||
    value.schema !== PROFILE_SCHEMA ||
    typeof value.savedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.savedAt))
  ) {
    throw new Error('Unsupported business profile.');
  }
  // Reuse the same text, email and logo validation as editable quotations.
  const draft = parseQuotation(
    JSON.stringify({ ...blankQuotation(), ...details(value) }),
  );
  return { schema: PROFILE_SCHEMA, savedAt: value.savedAt, ...details(draft) };
}
export function saveProfile(
  storage: QuoteStorage,
  draft: QuotationDraft,
  now = new Date().toISOString(),
): BusinessProfile {
  const profile = parseProfile(
    JSON.stringify({ schema: PROFILE_SCHEMA, savedAt: now, ...details(draft) }),
  );
  storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  return profile;
}
export function applyProfile(
  draft: QuotationDraft,
  profile: BusinessProfile,
): QuotationDraft {
  const next = { ...draft, ...details(profile), reviewed: false };
  // Reject combined draft overflow atomically, including existing customer text.
  parseQuotation(JSON.stringify(next));
  return next;
}
export function changedProfileFields(
  draft: QuotationDraft,
  profile: BusinessProfile,
): string[] {
  return profileFields.filter(
    (key) =>
      (key === 'logo' ? draft.logo !== null : !!draft[key]) &&
      JSON.stringify(draft[key] as string | QuoteLogo | null) !==
        JSON.stringify(profile[key]),
  );
}
