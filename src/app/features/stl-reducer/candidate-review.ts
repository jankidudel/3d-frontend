import { readStl, simplify, writeBinaryStl, type StlMesh } from './stl-reducer';
import { verifyStlGeometry } from '../converters/three-mf-stl-export';
import { geometryBounds } from '../shared/wall-thickness/three-mf-wall-thickness';
import {
  inspectMesh,
  type MeshIntegrityReport,
} from '../stl-print-preflight/stl-print-preflight-analysis';
import { WorkflowLimits } from '../repeat-workflows/mesh-workflows';
export const ReductionMethod = {
  Encoding: 'encoding',
  Reduction: 'reduction',
} as const;
export type ReductionMethod =
  (typeof ReductionMethod)[keyof typeof ReductionMethod];
export const ComparisonState = {
  NotRun: 'not run',
  Completed: 'completed',
  Limited: 'limited',
  Cancelled: 'cancelled',
  Failed: 'failed',
} as const;
export type ComparisonState =
  (typeof ComparisonState)[keyof typeof ComparisonState];
export const MAX_CANDIDATES = 3;
export const TOPOLOGY_FIELDS = [
  'openEdges',
  'nonManifoldEdges',
  'duplicateTriangles',
  'degenerateTriangles',
  'orientationConflicts',
] as const;
export function topologyReview(mesh: StlMesh): MeshIntegrityReport | null {
  return mesh.indices.length / 3 <= WorkflowLimits.Triangles
    ? inspectMesh(mesh)
    : null;
}
export function regressions(
  original: MeshIntegrityReport | null,
  candidate: MeshIntegrityReport | null,
): readonly string[] {
  return original && candidate
    ? TOPOLOGY_FIELDS.filter((field) => candidate[field] > original[field])
    : [];
}
export function comparisonLimit(
  sourceBytes: number,
  candidateBytes: number,
  original: StlMesh,
  candidate: StlMesh,
): string {
  return sourceBytes > WorkflowLimits.FileBytes ||
    candidateBytes > WorkflowLimits.FileBytes ||
    original.indices.length / 3 > WorkflowLimits.Triangles ||
    candidate.indices.length / 3 > WorkflowLimits.Triangles
    ? 'Surface comparison unavailable: each STL must be within 5 MiB and 100,000 triangles. Download for review in another application.'
    : '';
}
export async function reviewedCandidate(
  source: StlMesh,
  method: ReductionMethod,
  keepPercent: number,
  requestedTriangles?: number,
) {
  if (!(
    Number.isFinite(keepPercent) &&
    keepPercent > 0 &&
    keepPercent <= 100
  )) {
    throw new Error(
      'Choose a finite kept-triangle percentage above zero and at most 100.',
    );
  }
  if (
    requestedTriangles !== undefined &&
    (!Number.isInteger(requestedTriangles) ||
      requestedTriangles < 1 ||
      requestedTriangles >= source.indices.length / 3)
  ) {
    throw new Error(
      'Choose an integer triangle target below the original count.',
    );
  }
  const intended =
    method === ReductionMethod.Encoding
      ? source
      : await simplify(source, keepPercent, requestedTriangles);
  const blob = writeBinaryStl(intended);
  const reopened = await readStl(new File([blob], 'candidate.stl'));
  const bounds = geometryBounds(reopened);
  if (
    !verifyStlGeometry(intended, reopened) ||
    blob.size !== 84 + 50 * (reopened.indices.length / 3)
  ) {
    throw new Error(
      'Serialized candidate integrity failed. No derivative is offered.',
    );
  }
  const originalTopology = topologyReview(source);
  const topology = topologyReview(reopened);
  return {
    mesh: reopened,
    blob,
    method,
    keepPercent: method === ReductionMethod.Encoding ? 100 : keepPercent,
    requestedTriangles:
      method === ReductionMethod.Encoding
        ? source.indices.length / 3
        : (requestedTriangles ??
          Math.max(1, Math.floor((source.indices.length * keepPercent) / 300))),
    bounds,
    topology,
    originalTopology,
    regressions: regressions(originalTopology, topology),
    integrity:
      'Every oriented output triangle reopened equal under Float32 storage; binary record size confirmed.',
    storageError: source.maximumStorageError ?? 0,
    algorithm:
      method === ReductionMethod.Encoding
        ? 'Binary STL Float32 / inspectmesh-export-1'
        : 'meshoptimizer 1.2.0; target index count = requested triangles × 3; relative error 0.01; LockBorder',
  };
}
export type ReviewedCandidate = Awaited<ReturnType<typeof reviewedCandidate>>;
