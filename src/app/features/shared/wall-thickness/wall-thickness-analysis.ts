import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Ray,
  Vector3,
} from 'three';
import { MeshBVH } from 'three-mesh-bvh';

export interface IndexedTriangleGeometry {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
}
export const WallThicknessUnit = {
  Millimetres: 'mm',
  Centimetres: 'cm',
  Inches: 'inches',
} as const;
export type WallThicknessUnit =
  (typeof WallThicknessUnit)[keyof typeof WallThicknessUnit];
export const MAX_WALL_THICKNESS_SAMPLES = 2_000;
const MILLIMETRES_PER_UNIT: Readonly<Record<WallThicknessUnit, number>> = {
  mm: 1,
  cm: 10,
  inches: 25.4,
};
export interface ThicknessSample {
  readonly triangle: number;
  readonly thickness: number | null;
}
export interface WallThicknessReport {
  readonly samples: readonly ThicknessSample[];
  readonly measured: number;
  readonly unmeasured: number;
  readonly belowThreshold: number;
  readonly minimum: number | null;
  readonly average: number | null;
  readonly threshold: number;
  readonly unit: WallThicknessUnit;
}
export function unitMultiplier(
  from: WallThicknessUnit,
  to: WallThicknessUnit,
): number {
  return MILLIMETRES_PER_UNIT[from] / MILLIMETRES_PER_UNIT[to];
}
export function validThreshold(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
/** Uniformly spreads a bounded number of samples over the input triangle order. */
export function sampleTriangleIndices(
  triangleCount: number,
  maximum = MAX_WALL_THICKNESS_SAMPLES,
): number[] {
  if (!Number.isInteger(triangleCount) || triangleCount <= 0 || maximum <= 0) {
    return [];
  }
  const count = Math.min(triangleCount, Math.floor(maximum));
  return Array.from({ length: count }, (_, index) =>
    Math.floor((index * triangleCount) / count),
  );
}
export function analyseWallThickness(
  mesh: IndexedTriangleGeometry,
  threshold: number,
  unit: WallThicknessUnit,
): WallThicknessReport | null {
  if (
    !validThreshold(threshold) ||
    mesh.positions.length === 0 ||
    mesh.indices.length % 3 !== 0
  ) {
    return null;
  }
  // BufferGeometry only reads these arrays. Neither source array is modified.
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  const bvh = new MeshBVH(geometry);
  const position = geometry.getAttribute('position');
  const epsilon = 1e-5;
  const samples = sampleTriangleIndices(mesh.indices.length / 3).map(
    (triangle) => {
      const index = triangle * 3;
      const a = new Vector3().fromBufferAttribute(
        position,
        mesh.indices[index],
      );
      const b = new Vector3().fromBufferAttribute(
        position,
        mesh.indices[index + 1],
      );
      const c = new Vector3().fromBufferAttribute(
        position,
        mesh.indices[index + 2],
      );
      const normal = new Vector3().crossVectors(
        b.clone().sub(a),
        c.clone().sub(a),
      );
      if (normal.lengthSq() === 0) {
        return { triangle, thickness: null };
      }
      normal.normalize();
      const origin = a
        .add(b)
        .add(c)
        .multiplyScalar(1 / 3)
        .addScaledVector(normal, -epsilon);
      const hit = bvh.raycastFirst(
        new Ray(origin, normal.negate()),
        DoubleSide,
      );
      const thickness = hit && hit.distance > epsilon ? hit.distance : null;
      return {
        triangle,
        thickness:
          thickness !== null && Number.isFinite(thickness) ? thickness : null,
      };
    },
  );
  geometry.dispose();
  const measuredValues = samples.flatMap((sample) =>
    sample.thickness === null ? [] : [sample.thickness],
  );
  return {
    samples,
    measured: measuredValues.length,
    unmeasured: samples.length - measuredValues.length,
    belowThreshold: measuredValues.filter((value) => value < threshold).length,
    minimum: measuredValues.length ? Math.min(...measuredValues) : null,
    average: measuredValues.length
      ? measuredValues.reduce((sum, value) => sum + value, 0) /
        measuredValues.length
      : null,
    threshold,
    unit,
  };
}
