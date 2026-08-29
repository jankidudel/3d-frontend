export interface MeshQualityReport {
  readonly [key: string]: unknown;
  readonly topology?: MeshTopology;
  readonly validation?: MeshValidation;
}

export interface MeshTopology {
  readonly connectedComponentCount?: number;
  readonly openEdgeCount?: number;
  readonly nonManifoldEdgeCount?: number;
  readonly hasInconsistentOrientation?: boolean;
}

export interface MeshValidation {
  readonly isValid?: boolean;
  readonly issues?: readonly (MeshValidationIssue | string)[];
}

export interface MeshValidationIssue {
  readonly [key: string]: unknown;
  readonly code?: string;
  readonly message?: string;
  readonly count?: unknown;
  readonly severity?: 'error' | 'warning' | string;
}
