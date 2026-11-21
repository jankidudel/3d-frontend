import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Ray,
  Vector3,
} from 'three';
import { MeshBVH } from 'three-mesh-bvh';

import {
  IndexedTriangleGeometry,
  sampleTriangleIndices,
  validThreshold,
  WallThicknessReport,
  WallThicknessUnit,
} from './wall-thickness-model';

export {
  MAX_WALL_THICKNESS_SAMPLES,
  sampleTriangleIndices,
  unitMultiplier,
  validThreshold,
  WallThicknessUnit,
} from './wall-thickness-model';
export type {
  IndexedTriangleGeometry,
  ThicknessSample,
  WallThicknessReport,
} from './wall-thickness-model';

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
