export interface MeshQualityReport {
  readonly [key: string]: unknown;
  readonly topology?: MeshTopology;
  readonly validation?: MeshValidation;
  readonly issueGeometry?: MeshIssueGeometry;
}

export interface MeshIssueGeometry {
  readonly openEdges?: MeshIssueEdgeSegments;
  readonly nonManifoldEdges?: MeshIssueEdgeSegments;
}

export interface MeshIssueEdgeSegments {
  readonly totalCount?: number;
  readonly returnedCount?: number;
  readonly truncated?: boolean;
  readonly segments?: readonly MeshIssueEdgeSegment[];
}

export interface MeshIssueEdgeSegment {
  readonly start?:
    | readonly [number, number, number]
    | { readonly x: number; readonly y: number; readonly z: number };
  readonly end?:
    | readonly [number, number, number]
    | { readonly x: number; readonly y: number; readonly z: number };
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
