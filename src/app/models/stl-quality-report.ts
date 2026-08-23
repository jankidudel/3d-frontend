export interface StlQualityReport {
  readonly [key: string]: unknown;
  readonly topology?: StlTopology;
  readonly validation?: StlValidation;
}

export interface StlTopology {
  readonly connectedComponentCount?: number;
  readonly openEdgeCount?: number;
  readonly nonManifoldEdgeCount?: number;
  readonly hasInconsistentOrientation?: boolean;
}

export interface StlValidation {
  readonly isValid?: boolean;
  readonly issues?: readonly (StlValidationIssue | string)[];
}

export interface StlValidationIssue {
  readonly [key: string]: unknown;
  readonly code?: string;
  readonly message?: string;
  readonly count?: unknown;
  readonly severity?: 'error' | 'warning' | string;
}
