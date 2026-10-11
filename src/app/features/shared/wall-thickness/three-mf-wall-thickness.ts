import { unzipSync } from 'fflate';
import { Matrix4, Vector3 } from 'three';
import {
  IndexedTriangleGeometry,
  WallThicknessUnit,
} from './wall-thickness-analysis';

const UNIT_TO_WALL_UNIT: Readonly<Record<string, WallThicknessUnit>> = {
  millimeter: WallThicknessUnit.Millimetres,
  centimeter: WallThicknessUnit.Centimetres,
  inch: WallThicknessUnit.Inches,
};
const MILLIMETRES_PER_3MF_UNIT: Readonly<Record<string, number>> = {
  micron: 0.001,
  millimeter: 1,
  centimeter: 10,
  inch: 25.4,
  foot: 304.8,
  meter: 1000,
};

// Geometry contract reviewed against 3MF Core 1.4.0, sections 2.2, 3.3, 3.4, 4.2 (11 October 2026).
export const ThreeMfResolutionStatus = {
  Complete: 'Complete supported geometry',
  Unsupported: 'Unsupported required semantics',
  Invalid: 'Invalid model data',
  Limit: 'Processing limit reached',
} as const;
export type ThreeMfResolutionStatus =
  (typeof ThreeMfResolutionStatus)[keyof typeof ThreeMfResolutionStatus];
export class ThreeMfResolutionError extends Error {
  constructor(
    readonly status: ThreeMfResolutionStatus,
    message: string,
  ) {
    super(`${status}: ${message}`);
  }
}
export const ThreeMfLimits = {
  FileBytes: 25 * 1024 * 1024,
  ExpandedBytes: 20 * 1024 * 1024,
  Entries: 1024,
  Triangles: 500_000,
  Vertices: 1_500_000,
  Depth: 64,
  Instances: 10_000,
} as const;
const CORE = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const RELATION = 'http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel';
export interface GeometryBounds {
  readonly min: readonly number[];
  readonly max: readonly number[];
  readonly spans: readonly number[];
}
export interface PlacedThreeMfItem {
  readonly id: string;
  readonly label: string;
  readonly resourceId: string;
  readonly transform: readonly number[];
  readonly componentPaths: readonly string[];
  readonly geometry: IndexedTriangleGeometry;
  readonly bounds: GeometryBounds;
}
export interface ResolvedThreeMfGeometry {
  readonly geometry: IndexedTriangleGeometry;
  readonly declaredUnit: string;
  readonly declaredUnitExplicitly: boolean;
  readonly displayUnit: WallThicknessUnit;
  readonly extent: number;
  readonly buildItemCount: number;
  readonly resolvedMeshCount: number;
  readonly items: readonly PlacedThreeMfItem[];
  readonly bounds: GeometryBounds;
  readonly status: ThreeMfResolutionStatus;
  readonly limitations: readonly string[];
  readonly storedObjectCount: number;
  readonly modelPart: string;
  readonly sourceFloat32ErrorMm: number;
}
export interface ThreeMfPackageInfo {
  readonly declaredUnit: string;
  readonly declaredUnitExplicitly: boolean;
  readonly buildItemCount: number;
  readonly modelPartFound: boolean;
}
function fail(message: string): never {
  throw new ThreeMfResolutionError(ThreeMfResolutionStatus.Invalid, message);
}
function limit(message: string): never {
  throw new ThreeMfResolutionError(ThreeMfResolutionStatus.Limit, message);
}
function xml(text: string): Document {
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) {
    fail('DTD and entities are not supported.');
  }
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    fail('Malformed XML.');
  }
  return doc;
}
function children(element: Element, name: string): Element[] {
  return Array.from(element.children).filter(
    (child) =>
      child.localName === name && child.namespaceURI === element.namespaceURI,
  );
}
function child(element: Element, name: string): Element {
  const found = children(element, name);
  if (found.length !== 1) {
    fail(`Expected one ${name} element.`);
  }
  return found[0];
}
function packageModel(data: ArrayBuffer, requireRelationship = true) {
  if (data.byteLength > ThreeMfLimits.FileBytes) {
    limit('Compressed file exceeds 25 MiB.');
  }
  let expanded = 0;
  let entries = 0;
  // Read the complete directory before allocating decompressed entry buffers.
  const filter = (entry: { name: string; originalSize: number }) => {
    expanded += entry.originalSize;
    entries++;
    if (
      expanded > ThreeMfLimits.ExpandedBytes ||
      entries > ThreeMfLimits.Entries
    ) {
      limit('Package exceeds 20 MiB expanded bytes or 1,024 entries.');
    }
    if (entry.name.includes('..') || entry.name.includes('\\')) {
      fail('Unsafe package entry path.');
    }
    return false;
  };
  try {
    unzipSync(new Uint8Array(data), { filter });
    const files = unzipSync(new Uint8Array(data), {
      filter: (entry) => /\.(model|rels)$/i.test(entry.name),
    });
    const relBytes = files['_rels/.rels'];
    let path: string | undefined;
    if (relBytes) {
      const relationships = xml(new TextDecoder().decode(relBytes));
      const models = Array.from(
        relationships.getElementsByTagNameNS('*', 'Relationship'),
      ).filter((rel) => rel.getAttribute('Type') === RELATION);
      if (models.length !== 1) {
        fail('Expected one root model relationship.');
      }
      const rel = models[0];
      const target = rel.getAttribute('Target') ?? '';
      if (
        rel.getAttribute('TargetMode') === 'External' ||
        /[:?#\\]/.test(target) ||
        target.split('/').includes('..')
      ) {
        fail('External or unsafe model relationships are not loaded.');
      }
      path = target.replace(/^\//, '');
    } else if (!requireRelationship) {
      path = Object.keys(files).find((name) => /\.model$/i.test(name));
    } else {
      fail('Missing root model relationship.');
    }
    if (!path || !files[path]) {
      if (!requireRelationship) {
        return null;
      }
      fail('Referenced model part is missing.');
    }
    const model = xml(new TextDecoder().decode(files[path])).documentElement;
    if (model.localName !== 'model') {
      fail('Model root is missing.');
    }
    return { model, path };
  } catch (error) {
    if (error instanceof ThreeMfResolutionError) {
      throw error;
    }
    fail('Unreadable or encrypted ZIP package.');
  }
}
export function geometryBounds(
  geometry: IndexedTriangleGeometry,
): GeometryBounds {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const vertex of geometry.indices) {
    for (let axis = 0; axis < 3; axis++) {
      const value = geometry.positions[vertex * 3 + axis];
      if (!Number.isFinite(value)) {
        fail('Nonfinite resolved coordinates.');
      }
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }
  if (!geometry.indices.length) {
    fail('No placed triangle geometry.');
  }
  return { min, max, spans: max.map((value, axis) => value - min[axis]) };
}
function transform(element: Element): Matrix4 {
  const text = element.getAttribute('transform');
  if (text === null) {
    return new Matrix4();
  }
  const values = text.trim().split(/\s+/).map(Number);
  if (values.length !== 12 || !values.every(Number.isFinite)) {
    fail('Invalid placement transform.');
  }
  const m = new Matrix4().set(
    values[0],
    values[3],
    values[6],
    values[9],
    values[1],
    values[4],
    values[7],
    values[10],
    values[2],
    values[5],
    values[8],
    values[11],
    0,
    0,
    0,
    1,
  );
  if (!Number.isFinite(m.determinant()) || m.determinant() === 0) {
    fail('Singular or nonfinite placement transform.');
  }
  return m;
}
/** One bounded core geometry resolver: build identity is assigned before flattening. */
export async function resolveThreeMfWallGeometry(
  data: ArrayBuffer,
): Promise<ResolvedThreeMfGeometry> {
  const pkg = packageModel(data)!;
  const model = pkg.model;
  if (model.namespaceURI !== CORE) {
    fail('Unsupported core model namespace.');
  }
  const required = (model.getAttribute('requiredextensions') ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const recommended = (model.getAttribute('recommendedextensions') ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  for (const prefix of required) {
    const uri = model.lookupNamespaceURI(prefix);
    if (!uri) {
      fail(`Undeclared required extension prefix: ${prefix}.`);
    }
    if (uri !== CORE) {
      throw new ThreeMfResolutionError(
        ThreeMfResolutionStatus.Unsupported,
        `Required namespace ${uri}. Re-export supported mesh geometry from the original application; keep the source.`,
      );
    }
  }
  const limitations = [
    'Optional colours, materials, metadata and project settings are outside this geometry check. Keep the original 3MF.',
    'Bounds and triangle checks do not establish topology, solid unions or printability.',
  ];
  for (const prefix of recommended) {
    const uri = model.lookupNamespaceURI(prefix);
    if (uri !== CORE) {
      throw new ThreeMfResolutionError(
        ThreeMfResolutionStatus.Unsupported,
        `Recommended namespace ${uri ?? prefix} needs review in the original application before this geometry export.`,
      );
    }
  }
  const declaredUnit = model.getAttribute('unit') ?? 'millimeter';
  const scale = MILLIMETRES_PER_3MF_UNIT[declaredUnit];
  if (!scale) {
    fail('Unsupported declared unit.');
  }
  const resources = children(child(model, 'resources'), 'object');
  const objects = new Map<string, Element>();
  for (const resource of resources) {
    const id = resource.getAttribute('id') ?? '';
    if (!/^[1-9]\d*$/.test(id) || objects.has(id)) {
      fail('Invalid or duplicate object ID.');
    }
    objects.set(id, resource);
  }
  const build = children(child(model, 'build'), 'item');
  if (build.length > ThreeMfLimits.Instances) {
    limit('Too many placed items.');
  }
  let totalTriangles = 0;
  let totalVertices = 0;
  let instances = 0;
  let resolvedMeshCount = 0;
  let sourceFloat32ErrorMm = 0;
  const items: PlacedThreeMfItem[] = [];
  const allPositions: number[] = [];
  const allIndices: number[] = [];
  for (const [order, item] of build.entries()) {
    const positions: number[] = [];
    const indices: number[] = [];
    const paths: string[] = [];
    const resourceId = item.getAttribute('objectid') ?? '';
    const placement = transform(item);
    const walk = (
      reference: Element,
      matrix: Matrix4,
      ancestry: readonly string[],
    ) => {
      if (
        ++instances > ThreeMfLimits.Instances ||
        ancestry.length > ThreeMfLimits.Depth
      ) {
        limit('Component instance or recursion budget reached.');
      }
      if (
        Array.from(reference.attributes).some(
          (attribute) =>
            attribute.localName === 'path' && attribute.namespaceURI !== null,
        )
      ) {
        throw new ThreeMfResolutionError(
          ThreeMfResolutionStatus.Unsupported,
          'Cross-part component references require production-extension support.',
        );
      }
      const id = reference.getAttribute('objectid') ?? '';
      const object = objects.get(id);
      if (!object || ancestry.includes(id)) {
        fail(`Missing or cyclic object reference ${id}.`);
      }
      if (
        object.getAttribute('type') &&
        object.getAttribute('type') !== 'model'
      ) {
        throw new ThreeMfResolutionError(
          ThreeMfResolutionStatus.Unsupported,
          'Non-model object types need review in the authoring application.',
        );
      }
      const path = [...ancestry, id];
      paths.push(path.join(' / '));
      const meshes = children(object, 'mesh');
      const components = children(object, 'components');
      if (meshes.length + components.length !== 1) {
        fail(
          'Each placed object must contain one mesh or components definition.',
        );
      }
      if (components.length) {
        for (const component of children(components[0], 'component')) {
          walk(component, matrix.clone().multiply(transform(component)), path);
        }
        return;
      }
      resolvedMeshCount++;
      const mesh = meshes[0];
      const vertices = children(child(mesh, 'vertices'), 'vertex');
      totalVertices += vertices.length;
      if (totalVertices > ThreeMfLimits.Vertices) {
        limit('Resolved vertex budget reached.');
      }
      const start = positions.length / 3;
      for (const vertex of vertices) {
        const coords = ['x', 'y', 'z'].map((axis) => {
          const text = vertex.getAttribute(axis);
          if (text === null || !text.trim() || !Number.isFinite(Number(text))) {
            fail('Invalid vertex coordinate.');
          }
          return Number(text);
        });
        const point = new Vector3(...(coords as [number, number, number]))
          .applyMatrix4(matrix)
          .multiplyScalar(scale);
        const values = [point.x, point.y, point.z];
        if (
          !values.every(
            (value) =>
              Number.isFinite(value) && Number.isFinite(Math.fround(value)),
          )
        ) {
          fail('Coordinates exceed finite Float32 geometry.');
        }
        // Do not hide an early precision loss before STL verification.
        if (
          values.some((value) => Math.abs(value - Math.fround(value)) > 0.01)
        ) {
          limit(
            'Coordinates lose more than 0.01 mm in Float32 storage. Export nearer the origin in the source application.',
          );
        }
        sourceFloat32ErrorMm = Math.max(
          sourceFloat32ErrorMm,
          ...values.map((value) => Math.abs(value - Math.fround(value))),
        );
        positions.push(...values);
      }
      for (const triangle of children(child(mesh, 'triangles'), 'triangle')) {
        if (++totalTriangles > ThreeMfLimits.Triangles) {
          limit('Resolved build exceeds 500,000 triangles.');
        }
        const face = ['v1', 'v2', 'v3'].map((key) => {
          const text = triangle.getAttribute(key) ?? '';
          const index = Number(text);
          if (
            !/^\d+$/.test(text) ||
            !Number.isSafeInteger(index) ||
            index >= vertices.length
          ) {
            fail('Invalid triangle vertex reference.');
          }
          return start + index;
        });
        if (matrix.determinant() < 0) {
          [face[1], face[2]] = [face[2], face[1]];
        }
        indices.push(...face);
      }
    };
    walk(item, placement, []);
    const geometry = {
      positions: new Float32Array(positions),
      indices: new Uint32Array(indices),
    };
    const bounds = geometryBounds(geometry);
    const offset = allPositions.length / 3;
    for (const value of geometry.positions) {
      allPositions.push(value);
    }
    for (const value of geometry.indices) {
      allIndices.push(offset + value);
    }
    items.push({
      id: `build-${order + 1}`,
      label:
        objects.get(resourceId)?.getAttribute('name') ||
        `Placed item ${order + 1}`,
      resourceId,
      transform: placement.toArray(),
      componentPaths: paths,
      geometry,
      bounds,
    });
  }
  const geometry = {
    positions: new Float32Array(allPositions),
    indices: new Uint32Array(allIndices),
  };
  const bounds = geometryBounds(geometry);
  return {
    geometry,
    declaredUnit,
    declaredUnitExplicitly: model.hasAttribute('unit'),
    displayUnit:
      UNIT_TO_WALL_UNIT[declaredUnit] ?? WallThicknessUnit.Millimetres,
    extent: Math.max(Math.hypot(...bounds.spans), 1),
    buildItemCount: items.length,
    resolvedMeshCount,
    items,
    bounds,
    status: ThreeMfResolutionStatus.Complete,
    limitations,
    storedObjectCount: resources.length,
    modelPart: pkg.path,
    sourceFloat32ErrorMm,
  };
}
export function readDeclaredUnit(data: ArrayBuffer): string {
  return readThreeMfPackageInfo(data).declaredUnit;
}
export function readThreeMfPackageInfo(data: ArrayBuffer): ThreeMfPackageInfo {
  const pkg = packageModel(data, false);
  return {
    declaredUnit: pkg?.model.getAttribute('unit') ?? 'millimeter',
    declaredUnitExplicitly: pkg?.model.hasAttribute('unit') ?? false,
    buildItemCount: pkg
      ? children(pkg.model, 'build').flatMap((build) => children(build, 'item'))
          .length
      : 0,
    modelPartFound: pkg !== null,
  };
}
