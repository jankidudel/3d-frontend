import { describe, expect, it } from 'vitest';
import {
  canPublishHandsOnReview,
  PrinterReviewUnitAccess,
} from './printer-review';

describe('hands-on review safeguards', () => {
  it('keeps a specification-only draft unpublished', () => {
    expect(
      canPublishHandsOnReview({
        printerId: 'a',
        unitAccess: PrinterReviewUnitAccess.None,
        disclosure: 'No unit.',
        publish: false,
      }),
    ).toBe(false);
  });
  it('requires evidence before publication', () => {
    expect(
      canPublishHandsOnReview({
        printerId: 'a',
        unitAccess: PrinterReviewUnitAccess.Owned,
        disclosure: 'Owned.',
        testingStartedAt: '2026-01-01',
        testingCompletedAt: '2026-01-02',
        firmwareVersion: '1',
        slicerAndVersion: '1',
        testedMaterials: ['PLA'],
        testModels: [
          {
            name: 'cube',
            purpose: 'dimension check',
            settingsSummary: 'standard',
            resultNotes: 'recorded',
          },
        ],
        verdict: 'Evidence-based conclusion.',
        publish: true,
      }),
    ).toBe(true);
  });
});
