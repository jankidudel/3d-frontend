import {
  Camera,
  Mesh,
  Object3D,
  Raycaster,
  Vector2,
  Vector3,
  type Intersection,
  type Material,
} from 'three';
import {
  add,
  MeasurementPoint,
  MeasurementPolicy,
  Point3,
  SelectionBasis,
} from './measurement';
interface PickViewport {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}
export interface MeasurementPick {
  readonly surface: MeasurementPoint | null;
  readonly candidates: readonly MeasurementPoint[];
}
function visibleMesh(object: Object3D): boolean {
  let ancestor: Object3D | null = object;
  while (ancestor) {
    if (!ancestor.visible) {
      return false;
    }
    ancestor = ancestor.parent;
  }
  return object instanceof Mesh;
}
function materialFor(hit: Intersection): Material | undefined {
  const mesh = hit.object as Mesh;
  return Array.isArray(mesh.material)
    ? mesh.material[hit.face?.materialIndex ?? 0]
    : mesh.material;
}
function unclipped(point: Vector3, material: Material | undefined): boolean {
  return (
    material?.visible !== false &&
    !material?.clippingPlanes?.some((p) => p.distanceToPoint(point) < 0)
  );
}
function eligible(hit: Intersection): boolean {
  return (
    visibleMesh(hit.object) &&
    hit.face != null &&
    unclipped(hit.point, materialFor(hit))
  );
}
/** Bounded to the nearest eligible hit triangle. Screen tolerance is interaction
 * policy, never geometric uncertainty. An occlusion ray checks each candidate. */
export function pickMeasurement(
  object: Object3D,
  camera: Camera,
  viewport: PickViewport,
  clientX: number,
  clientY: number,
  touch: boolean,
  offset: Point3,
): MeasurementPick {
  if (viewport.width <= 0 || viewport.height <= 0) {
    return { surface: null, candidates: [] };
  }
  object.updateWorldMatrix(true, true);
  camera.updateMatrixWorld();
  const ray = new Raycaster();
  ray.setFromCamera(
    new Vector2(
      ((clientX - viewport.left) / viewport.width) * 2 - 1,
      (-(clientY - viewport.top) / viewport.height) * 2 + 1,
    ),
    camera,
  );
  const hit = ray.intersectObject(object, true).find(eligible);
  if (!hit || !hit.face) {
    return { surface: null, candidates: [] };
  }
  const mesh = hit.object as Mesh;
  const identity = {
    meshId: mesh.name || `mesh-${mesh.id}`,
    placedItemId: mesh.userData['placedItemId'] as string | undefined,
    faceIndex: hit.faceIndex ?? undefined,
  };
  const surface: MeasurementPoint = {
    coordinates: add(hit.point.toArray(), offset),
    basis: SelectionBasis.Surface,
    ...identity,
  };
  const position = mesh.geometry.getAttribute('position');
  const radius = touch
    ? MeasurementPolicy.touchRadius
    : MeasurementPolicy.pointerRadius;
  const candidates: { point: MeasurementPoint; distance: number }[] = [];
  for (const index of [hit.face.a, hit.face.b, hit.face.c]) {
    const world = new Vector3()
      .fromBufferAttribute(position, index)
      .applyMatrix4(mesh.matrixWorld);
    const screen = world.clone().project(camera);
    const distance = Math.hypot(
      viewport.left + ((screen.x + 1) * viewport.width) / 2 - clientX,
      viewport.top + ((1 - screen.y) * viewport.height) / 2 - clientY,
    );
    if (
      distance > radius ||
      screen.z < -1 ||
      screen.z > 1 ||
      !unclipped(world, materialFor(hit))
    ) {
      continue;
    }
    const sight = new Raycaster();
    sight.setFromCamera(new Vector2(screen.x, screen.y), camera);
    const nearer = sight.intersectObject(object, true).find(eligible);
    const vertexDistance = sight.ray.origin.distanceTo(world);
    const epsilon = Math.max(vertexDistance, 1) * 1e-6;
    if (nearer && nearer.distance < vertexDistance - epsilon) {
      continue;
    }
    const point: MeasurementPoint = {
      coordinates: add(world.toArray(), offset),
      basis: SelectionBasis.Vertex,
      ...identity,
      vertexIndex: index,
    };
    if (
      !candidates.some((c) =>
        c.point.coordinates.every((v, axis) => v === point.coordinates[axis]),
      )
    ) {
      candidates.push({ point, distance });
    }
  }
  candidates.sort(
    (a, b) =>
      a.distance - b.distance ||
      (a.point.vertexIndex ?? 0) - (b.point.vertexIndex ?? 0),
  );
  return { surface, candidates: candidates.map((c) => c.point) };
}
