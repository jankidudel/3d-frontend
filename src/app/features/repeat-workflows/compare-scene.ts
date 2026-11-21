import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  Points,
  PointsMaterial,
} from 'three';
import type { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-model';
import { bufferGeometry, type SurfaceDifference } from './mesh-workflows';

export { meshSurfaceArea } from './mesh-workflows';

/**
 * three.js scene for the before/after comparison. The compare page loads this
 * module only once a model is chosen, so the landing page stays light.
 */
export function buildComparisonScene(
  items: readonly (IndexedTriangleGeometry | null | undefined)[],
  difference: SurfaceDifference | null,
  opacity: number,
): { readonly group: Group; readonly extent: number } | null {
  const group = new Group();
  items.forEach((mesh, index) => {
    if (mesh) {
      const geometry = bufferGeometry(mesh);
      const colors = new Float32Array(mesh.positions.length);
      for (let i = 0; i < colors.length; i += 3) {
        colors.set(index === 0 ? [0.05, 0.65, 0.8] : [0.85, 0.25, 0.1], i);
      }
      geometry.setAttribute('color', new BufferAttribute(colors, 3));
      group.add(
        new Mesh(
          geometry,
          new MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity,
            side: DoubleSide,
            depthWrite: false,
          }),
        ),
      );
    }
  });
  if (difference) {
    const changed = [...difference.forward, ...difference.reverse].filter(
      (sample) => sample.distance > difference.toleranceMm,
    );
    if (changed.length) {
      const geometry = new BufferGeometry();
      geometry.setAttribute(
        'position',
        new BufferAttribute(
          new Float32Array(changed.flatMap((sample) => sample.point)),
          3,
        ),
      );
      group.add(
        new Points(
          geometry,
          new PointsMaterial({
            color: '#941647',
            size: 1.5,
            sizeAttenuation: false,
          }),
        ),
      );
    }
  }
  if (group.children.length) {
    const minimum = [Infinity, Infinity, Infinity];
    const maximum = [-Infinity, -Infinity, -Infinity];
    for (const item of items) {
      if (item) {
        for (let i = 0; i < item.positions.length; i++) {
          const axis = i % 3;
          minimum[axis] = Math.min(minimum[axis], item.positions[i]);
          maximum[axis] = Math.max(maximum[axis], item.positions[i]);
        }
      }
    }
    return {
      group,
      extent: Math.max(
        ...minimum.map((value, axis) => maximum[axis] - value),
        1,
      ),
    };
  }
  return null;
}

export function disposeComparisonScene(group: Group): void {
  group.traverse((object) => {
    if (object instanceof Mesh || object instanceof Points) {
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material.dispose());
    }
  });
}
