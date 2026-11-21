/** Self-intersection report shapes, usable without loading three.js. */
export const IntersectionCheckState = {
  Complete: 'complete',
  Found: 'found',
  Skipped: 'skipped',
  Incomplete: 'incomplete',
} as const;
export type IntersectionCheckState =
  (typeof IntersectionCheckState)[keyof typeof IntersectionCheckState];

export interface TriangleIntersectionFinding {
  readonly triangles: readonly [number, number];
  readonly location: readonly [number, number, number];
  readonly kind: 'crossing' | 'ambiguous';
}

export interface SelfIntersectionReport {
  readonly state: IntersectionCheckState;
  readonly findings: readonly TriangleIntersectionFinding[];
  readonly reason?: string;
  readonly candidatePairs: number;
}

export const MAX_INTERSECTION_TRIANGLES = 100_000;
export const MAX_INTERSECTION_FINDINGS = 500;
