import { BufferAttribute, BufferGeometry, Box3, Vector3 } from 'three';
import { ExtendedTriangle, MeshBVH } from 'three-mesh-bvh';
import { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-analysis';

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

/** BVH-accelerated triangle-pair screen. The cap keeps browser memory bounded. */
export function findSelfIntersections(
  mesh: IndexedTriangleGeometry,
): SelfIntersectionReport {
  const triangleCount = mesh.indices.length / 3;
  if (
    mesh.indices.length % 3 !== 0 ||
    mesh.positions.length % 3 !== 0 ||
    triangleCount === 0
  ) {
    return {
      state: IntersectionCheckState.Skipped,
      findings: [],
      reason: 'The triangle data is empty or malformed.',
      candidatePairs: 0,
    };
  }
  if (triangleCount > MAX_INTERSECTION_TRIANGLES) {
    return {
      state: IntersectionCheckState.Skipped,
      findings: [],
      reason: `This check is limited to ${MAX_INTERSECTION_TRIANGLES.toLocaleString()} triangles to bound browser memory and response time.`,
      candidatePairs: 0,
    };
  }
  if (
    mesh.indices.some((index) => index * 3 + 2 >= mesh.positions.length) ||
    mesh.positions.some((value) => !Number.isFinite(value))
  ) {
    return {
      state: IntersectionCheckState.Incomplete,
      findings: [],
      reason: 'The mesh contains invalid indices or nonfinite coordinates.',
      candidatePairs: 0,
    };
  }
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    const a = mesh.indices[triangle * 3];
    const b = mesh.indices[triangle * 3 + 1];
    const c = mesh.indices[triangle * 3 + 2];
    const ab = new Vector3(
      mesh.positions[b * 3] - mesh.positions[a * 3],
      mesh.positions[b * 3 + 1] - mesh.positions[a * 3 + 1],
      mesh.positions[b * 3 + 2] - mesh.positions[a * 3 + 2],
    );
    const ac = new Vector3(
      mesh.positions[c * 3] - mesh.positions[a * 3],
      mesh.positions[c * 3 + 1] - mesh.positions[a * 3 + 1],
      mesh.positions[c * 3 + 2] - mesh.positions[a * 3 + 2],
    );
    if (a === b || b === c || a === c || ab.cross(ac).lengthSq() === 0) {
      return {
        state: IntersectionCheckState.Incomplete,
        findings: [],
        reason: `Triangle ${triangle + 1} is degenerate; intersection review is incomplete.`,
        candidatePairs: 0,
      };
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  try {
    const bvh = new MeshBVH(geometry, { maxLeafSize: 8 });
    const candidate = new Box3();
    const first = [new Vector3(), new Vector3(), new Vector3()] as const;
    const second = [new Vector3(), new Vector3(), new Vector3()] as const;
    const point = new Vector3();
    const findings: TriangleIntersectionFinding[] = [];
    const seen = new Set<string>();
    let candidatePairs = 0;
    let incomplete = false;

    for (
      let firstTriangle = 0;
      firstTriangle < triangleCount;
      firstTriangle++
    ) {
      if (findings.length >= MAX_INTERSECTION_FINDINGS) {
        incomplete = true;
        break;
      }
      readTriangle(mesh, firstTriangle, first);
      candidate.makeEmpty().setFromPoints([...first]);
      bvh.shapecast({
        intersectsBounds: (bounds) => bounds.intersectsBox(candidate),
        intersectsTriangle: (other, secondTriangle) => {
          if (secondTriangle <= firstTriangle) {
            return false;
          }
          const key = `${firstTriangle}:${secondTriangle}`;
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          candidatePairs += 1;
          readTriangle(mesh, secondTriangle, second);
          if (sharesVertex(mesh, firstTriangle, secondTriangle)) {
            return false;
          }
          const triA = new ExtendedTriangle(first[0], first[1], first[2]);
          if (!triA.intersectsTriangle(other)) {
            return false;
          }
          const kind =
            identicalTriangle(mesh, firstTriangle, secondTriangle) ||
            coplanar(first, second)
              ? 'ambiguous'
              : 'crossing';
          point
            .copy(first[0])
            .add(first[1])
            .add(first[2])
            .add(second[0])
            .add(second[1])
            .add(second[2])
            .multiplyScalar(1 / 6);
          findings.push({
            triangles: [firstTriangle, secondTriangle],
            location: [point.x, point.y, point.z],
            kind,
          });
          return false;
        },
      });
    }
    if (incomplete) {
      return {
        state: IntersectionCheckState.Incomplete,
        findings,
        reason: `The result reached the ${MAX_INTERSECTION_FINDINGS}-finding limit; remaining pairs were not checked.`,
        candidatePairs,
      };
    }
    return {
      state: findings.length
        ? IntersectionCheckState.Found
        : IntersectionCheckState.Complete,
      findings,
      candidatePairs,
    };
  } catch {
    return {
      state: IntersectionCheckState.Incomplete,
      findings: [],
      reason: 'The accelerated geometry check could not be completed.',
      candidatePairs: 0,
    };
  } finally {
    geometry.dispose();
  }
}

function coplanar(
  first: readonly [Vector3, Vector3, Vector3],
  second: readonly [Vector3, Vector3, Vector3],
): boolean {
  const normal = new Vector3()
    .subVectors(first[1], first[0])
    .cross(new Vector3().subVectors(first[2], first[0]));
  const otherNormal = new Vector3()
    .subVectors(second[1], second[0])
    .cross(new Vector3().subVectors(second[2], second[0]));
  const scale = Math.max(normal.length() * otherNormal.length(), 1);
  if (normal.cross(otherNormal).length() > scale * 1e-10) {
    return false;
  }
  const distance = Math.abs(
    normal.dot(new Vector3().subVectors(second[0], first[0])),
  );
  return distance <= Math.max(normal.length(), 1) * 1e-7;
}

function readTriangle(
  mesh: IndexedTriangleGeometry,
  triangle: number,
  target: readonly [Vector3, Vector3, Vector3],
): void {
  for (let corner = 0; corner < 3; corner++) {
    const offset = mesh.indices[triangle * 3 + corner] * 3;
    target[corner].set(
      mesh.positions[offset],
      mesh.positions[offset + 1],
      mesh.positions[offset + 2],
    );
  }
}

function sharesVertex(
  mesh: IndexedTriangleGeometry,
  first: number,
  second: number,
): boolean {
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 3; b++) {
      if (mesh.indices[first * 3 + a] === mesh.indices[second * 3 + b]) {
        return true;
      }
    }
  }
  return false;
}

function identicalTriangle(
  mesh: IndexedTriangleGeometry,
  first: number,
  second: number,
): boolean {
  const signature = (triangle: number) =>
    Array.from({ length: 3 }, (_, corner) => {
      const offset = mesh.indices[triangle * 3 + corner] * 3;
      return `${mesh.positions[offset]}:${mesh.positions[offset + 1]}:${mesh.positions[offset + 2]}`;
    })
      .sort()
      .join('|');
  return signature(first) === signature(second);
}
