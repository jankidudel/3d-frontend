import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Ray,
  Vector3,
} from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { StlMesh } from '../stl-reducer/stl-reducer';

export const WallThicknessUnit = {
  Millimetres: 'mm',
  Centimetres: 'cm',
  Inches: 'inches',
} as const;
export type WallThicknessUnit =
  (typeof WallThicknessUnit)[keyof typeof WallThicknessUnit];
export const MAX_WALL_THICKNESS_SAMPLES = 2_000;
const MILLIMETRES_PER_UNIT: Record<WallThicknessUnit, number> = {
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

export function sampleTriangleIndices(
  triangleCount: number,
  maximum = MAX_WALL_THICKNESS_SAMPLES,
): number[] {
  if (!Number.isInteger(triangleCount) || triangleCount <= 0) {
    return [];
  }
  const count = Math.min(triangleCount, maximum);
  return Array.from({ length: count }, (_, index) =>
    Math.floor((index * triangleCount) / count),
  );
}

export function analyseWallThickness(
  mesh: StlMesh,
  threshold: number,
  unit: WallThicknessUnit,
): WallThicknessReport | null {
  if (!validThreshold(threshold)) {
    return null;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  const bvh = new MeshBVH(geometry);
  const multiplier = unitMultiplier(WallThicknessUnit.Millimetres, unit);
  const epsilon = 1e-5;
  const samples = sampleTriangleIndices(mesh.indices.length / 3).map(
    (triangle) => {
      const index = triangle * 3;
      const a = new Vector3().fromBufferAttribute(
        geometry.getAttribute('position'),
        mesh.indices[index],
      );
      const b = new Vector3().fromBufferAttribute(
        geometry.getAttribute('position'),
        mesh.indices[index + 1],
      );
      const c = new Vector3().fromBufferAttribute(
        geometry.getAttribute('position'),
        mesh.indices[index + 2],
      );
      const normal = new Vector3()
        .crossVectors(b.clone().sub(a), c.clone().sub(a))
        .normalize();
      if (!Number.isFinite(normal.lengthSq()) || normal.lengthSq() === 0) {
        return { triangle, thickness: null };
      }
      const origin = a
        .add(b)
        .add(c)
        .multiplyScalar(1 / 3)
        .addScaledVector(normal, -epsilon);
      const hit = bvh.raycastFirst(
        new Ray(origin, normal.clone().negate()),
        DoubleSide,
      );
      const distance =
        hit && hit.distance > epsilon ? hit.distance * multiplier : null;
      return {
        triangle,
        thickness: distance && Number.isFinite(distance) ? distance : null,
      };
    },
  );
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
