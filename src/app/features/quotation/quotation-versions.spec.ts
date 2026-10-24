import { describe, expect, it } from 'vitest';
import {
  blankQuotation,
  customerQuotation,
  parseQuotation,
  PREVIOUS_QUOTE_SCHEMA,
  sampleQuotation,
  serializeQuotation,
} from './quotation';
import {
  keepQuotation,
  MAX_FAMILY_BYTES,
  parseArchive,
  quotationFamily,
  quotationPdfFilename,
  reviseQuotation,
  saveFamily,
  serializeArchive,
} from './quotation-versions';
import {
  applyProfile,
  changedProfileFields,
  parseProfile,
  PROFILE_STORAGE_KEY,
  saveProfile,
} from './quotation-profile';

const reviewedSample = () => ({ ...sampleQuotation(), reviewed: true });
function storage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}
describe('quotation revisions and archives', () => {
  it('retains an independent public document and private context while revising the specification', () => {
    const original = reviewedSample();
    const family = keepQuotation(quotationFamily(original), original);
    const revised = reviseQuotation(family, original);
    revised.current.quantity = '10';
    revised.current.material = 'PETG';
    revised.current.orderPrice = '125';
    expect(revised.versions[0].customer.quantity).toBe(5);
    expect(revised.versions[0].customer.orderCents).toBe(6030);
    expect(revised.current.reviewed).toBe(false);
    expect(revised.current.fictionalExample).toBe(true);
    expect(revised.current.reference).toBe(original.reference);
    expect(revised.current.issueDate).toBe(original.issueDate);
    expect(
      customerQuotation({ ...revised.current, reviewed: true }),
    ).toBeNull();
    revised.current.changeSummary =
      'Ten PETG parts, re-sliced and priced again';
    revised.current.reviewed = true;
    expect(customerQuotation(revised.current)?.parentVersionNumber).toBe(1);
    expect(customerQuotation(revised.current)?.totalCents).toBe(12500);
    expect(original.quantity).toBe('5');
    expect(family.versions).toHaveLength(1);
  });
  it('never overwrites a retained snapshot and keeps the complete family through explicit save and archive round trip', () => {
    const original = reviewedSample();
    const family = keepQuotation(quotationFamily(original), original);
    expect(() =>
      keepQuotation(family, { ...original, orderPrice: '99' }),
    ).toThrow(/already retained/);
    const revised = reviseQuotation(family, original);
    revised.current.changeSummary = 'New delivery terms';
    revised.current.reviewed = true;
    const kept = keepQuotation(revised, revised.current);
    const restored = parseArchive(serializeArchive(kept, kept.current));
    expect(restored.versions.map((v) => v.customer.versionNumber)).toEqual([
      1, 2,
    ]);
    expect(restored.versions[1].customer.changeSummary).toBe(
      'New delivery terms',
    );
    expect(restored.current.reviewed).toBe(false);
    const local = storage();
    expect(local.data.size).toBe(0);
    saveFamily(local, kept, kept.current);
    expect(local.data.size).toBe(1);
    expect(kept.current.reviewed).toBe(true);
  });
  it('enforces ten versions without silently discarding the original', () => {
    let family = quotationFamily(reviewedSample());
    for (let number = 1; number <= 10; number++) {
      family.current.reviewed = true;
      family.current.changeSummary = number === 1 ? '' : `Revision ${number}`;
      family = keepQuotation(family, family.current);
      if (number < 10) {
        family = reviseQuotation(family, family.current);
      }
    }
    const previous = structuredClone(family);
    expect(() => reviseQuotation(family, family.current)).toThrow(/Ten/);
    expect(family).toEqual(previous);
    expect(
      parseArchive(serializeArchive(family, family.current)).versions,
    ).toHaveLength(10);
  });
  it('rejects duplicate IDs, inconsistent numbers, cycles and cross-family parents atomically', () => {
    const original = reviewedSample();
    const family = reviseQuotation(quotationFamily(original), original);
    const bad = [
      { ...family, versions: [...family.versions, family.versions[0]] },
      {
        ...family,
        current: {
          ...family.current,
          parentVersionId: family.current.versionId,
        },
      },
      { ...family, current: { ...family.current, parentVersionNumber: 2 } },
      {
        ...family,
        versions: [
          {
            ...family.versions[0],
            draft: { ...original, familyId: 'another-family' },
          },
        ],
      },
      { ...family, current: { ...family.current, versionNumber: 1.5 } },
    ];
    const previous = structuredClone(family);
    for (const value of bad) {
      expect(() => parseArchive(JSON.stringify(value))).toThrow();
    }
    expect(() => parseArchive(' '.repeat(MAX_FAMILY_BYTES + 1))).toThrow(
      /4 MiB/,
    );
    expect(family).toEqual(previous);
  });
  it('migrates a previous single draft, ignores unknown and prototype keys, and leaves markup inert', () => {
    const legacy: Record<string, unknown> = {
      ...reviewedSample(),
      schema: PREVIOUS_QUOTE_SCHEMA,
      reviewNotes: '<script>private()</script>',
    };
    for (const key of [
      'familyId',
      'versionId',
      'versionNumber',
      'parentVersionId',
      'parentVersionNumber',
      'changeSummary',
    ]) {
      delete legacy[key];
    }
    const next = parseQuotation(
      JSON.stringify(legacy).replace(
        '"schema":',
        '"__proto__":{"polluted":true},"unknown":"discard","schema":',
      ),
    );
    expect(next.versionNumber).toBe(1);
    expect(next.reviewed).toBe(false);
    expect(next.reviewNotes).toBe('<script>private()</script>');
    expect(Object.hasOwn(next, '__proto__')).toBe(false);
    expect(Object.hasOwn(next, 'unknown')).toBe(false);
    expect(Object.hasOwn({}, 'polluted')).toBe(false);
  });
  it('requires review for manual, sample and reopened drafts and uses safe versioned PDF names', () => {
    expect(customerQuotation(sampleQuotation())).toBeNull();
    expect(parseQuotation(serializeQuotation(reviewedSample())).reviewed).toBe(
      false,
    );
    expect(quotationPdfFilename('EXAMPLE-001', 2)).toBe('EXAMPLE-001-v2.pdf');
    expect(quotationPdfFilename('../\\\u0000', 2)).toBe('quotation-v2.pdf');
    expect(quotationPdfFilename('Łódź / Quote', 2)).not.toContain('/');
    expect(quotationPdfFilename('Łódź / Quote', 2)).not.toContain('\\');
  });
});
describe('business profiles', () => {
  it('saves only business fields and applies without changing any customer or job field', () => {
    const local = storage();
    const source = {
      ...reviewedSample(),
      businessEmail: 'shop@example.com',
      address: 'Example address',
      paymentInstructions: 'Payment by agreement',
    };
    const profile = saveProfile(local, source, '2026-10-24T12:00:00Z');
    const json = local.getItem(PROFILE_STORAGE_KEY)!;
    for (const field of [
      'customerName',
      'reference',
      'quantity',
      'orderPrice',
      'internal',
      'modelFilename',
      'reviewNotes',
      'familyId',
    ]) {
      expect(json).not.toContain(`"${field}"`);
    }
    const target = {
      ...reviewedSample(),
      businessName: 'Other business',
      customerName: 'Different fictional customer',
      quantity: '27',
      orderPrice: '880',
      modelFilename: 'different-r5.stl',
    };
    const next = applyProfile(target, profile);
    expect(changedProfileFields(target, profile)).toContain('businessName');
    for (const key of [
      'customerName',
      'reference',
      'quantity',
      'orderPrice',
      'internal',
      'modelFilename',
      'familyId',
    ] as const) {
      expect(next[key]).toEqual(target[key]);
    }
    expect(next.businessEmail).toBe('shop@example.com');
    expect(next.reviewed).toBe(false);
    local.removeItem(PROFILE_STORAGE_KEY);
    expect(target.customerName).toBe('Different fictional customer');
  });
  it('keeps earlier saved data and editor on quota failure, invalid data and oversized profiles', () => {
    const local = storage();
    saveProfile(local, reviewedSample());
    const previous = local.getItem(PROFILE_STORAGE_KEY);
    const blocked = {
      ...local,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => saveProfile(blocked, reviewedSample())).toThrow('quota');
    expect(local.getItem(PROFILE_STORAGE_KEY)).toBe(previous);
    expect(() => parseProfile(' '.repeat(1024 * 1024 + 1))).toThrow(/1 MiB/);
    expect(() =>
      saveProfile(local, { ...blankQuotation(), businessEmail: 'bad-email' }),
    ).toThrow();
    expect(local.getItem(PROFILE_STORAGE_KEY)).toBe(previous);
  });
});

it('round trips a standalone revised draft without inventing earlier snapshots', () => {
  const original = reviewedSample();
  const revised = reviseQuotation(quotationFamily(original), original).current;
  revised.changeSummary = 'Changed delivery scope';
  revised.reviewed = true;
  const reopened = parseQuotation(serializeQuotation(revised));
  const partial = quotationFamily(reopened);
  const restored = parseArchive(serializeArchive(partial, reopened));
  expect(restored.current.versionNumber).toBe(2);
  expect(restored.versions).toHaveLength(0);
  const next = reviseQuotation(partial, { ...reopened, reviewed: true });
  expect(next.current.versionNumber).toBe(3);
  expect(next.versions.map((version) => version.draft.versionNumber)).toEqual([
    2,
  ]);
  expect(
    parseArchive(serializeArchive(next, next.current)).versions,
  ).toHaveLength(1);
});

it('rejects combined draft and family overflow without changing the retained records', () => {
  const draft = {
    ...reviewedSample(),
    logo: {
      dataUrl: 'data:image/png;base64,' + 'A'.repeat(750000),
      width: 1,
      height: 1,
    },
  };
  let family = keepQuotation(quotationFamily(draft), draft);
  family = reviseQuotation(family, draft);
  family.current.changeSummary = 'Second quotation';
  family.current.reviewed = true;
  family = keepQuotation(family, family.current);
  const previous = structuredClone(family);
  const third = reviseQuotation(family, family.current);
  third.current.changeSummary = 'Third quotation';
  third.current.reviewed = true;
  expect(() => keepQuotation(third, third.current)).toThrow(/4 MiB/);
  expect(family).toEqual(previous);
  const local = storage();
  const profile = saveProfile(local, draft);
  const big = {
    ...draft,
    logo: {
      ...draft.logo,
      dataUrl: 'data:image/png;base64,' + 'A'.repeat(1047000),
    },
  };
  const bigProfile = saveProfile(local, big);
  const full = { ...reviewedSample(), agreedScope: 'ą'.repeat(5000) };
  expect(() => applyProfile(full, bigProfile)).toThrow(/1 MiB/);
  expect(full.logo).toBeNull();
  expect(profile.logo?.dataUrl).toBe(draft.logo.dataUrl);
});
