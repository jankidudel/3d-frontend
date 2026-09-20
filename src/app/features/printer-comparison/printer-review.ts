export const PrinterReviewUnitAccess = {
  Owned: 'owned',
  Loaned: 'loaned',
  Provided: 'provided',
  None: 'none',
} as const;

export type PrinterReviewUnitAccess =
  (typeof PrinterReviewUnitAccess)[keyof typeof PrinterReviewUnitAccess];

export interface PrinterReviewEvidence {
  readonly printerId: string;
  readonly unitAccess: PrinterReviewUnitAccess;
  readonly disclosure: string;
  readonly testingStartedAt?: string;
  readonly testingCompletedAt?: string;
  readonly firmwareVersion?: string;
  readonly slicerAndVersion?: string;
  readonly testedMaterials?: readonly string[];
  readonly testModels?: readonly {
    readonly name: string;
    readonly purpose: string;
    readonly settingsSummary: string;
    readonly resultNotes: string;
    readonly originalEvidencePaths?: readonly string[];
  }[];
  readonly failures?: readonly string[];
  readonly verdict?: string;
  readonly publish?: boolean;
}

export function canPublishHandsOnReview(
  evidence: PrinterReviewEvidence,
): boolean {
  return (
    evidence.publish === true &&
    evidence.unitAccess !== PrinterReviewUnitAccess.None &&
    Boolean(evidence.disclosure) &&
    Boolean(evidence.testingStartedAt) &&
    Boolean(evidence.testingCompletedAt) &&
    Boolean(evidence.firmwareVersion) &&
    Boolean(evidence.slicerAndVersion) &&
    (evidence.testedMaterials?.length ?? 0) > 0 &&
    (evidence.testModels?.length ?? 0) > 0 &&
    Boolean(evidence.verdict)
  );
}

export const reviewDrafts: readonly PrinterReviewEvidence[] = [
  {
    printerId: 'bambu-lab-a1',
    unitAccess: PrinterReviewUnitAccess.None,
    disclosure: 'No physical unit has been tested by InspectMesh.',
    publish: false,
  },
];
