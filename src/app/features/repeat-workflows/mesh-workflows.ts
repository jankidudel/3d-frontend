import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import {
  inspectMesh,
  meshDimensions,
} from '../stl-print-preflight/stl-print-preflight-analysis';
import {
  IndexedTriangleGeometry,
  analyseWallThickness,
  WallThicknessUnit,
} from '../shared/wall-thickness/wall-thickness-analysis';

export const WorkflowLimits = {
  FileBytes: 5 * 1024 * 1024,
  ExpandedPackageBytes: 20 * 1024 * 1024,
  Triangles: 100000,
  FreeQueue: 3,
  DevQueue: 20,
  CompareSamples: 5000,
} as const;
/** Development offers never establish a production subscription entitlement. */
export function collectionAllowance(
  development: boolean,
  preview: boolean,
): number {
  return development && preview
    ? WorkflowLimits.DevQueue
    : WorkflowLimits.FreeQueue;
}
export const QueueState = {
  Waiting: 'waiting',
  Reading: 'reading',
  Checking: 'checking',
  Complete: 'complete',
  Failed: 'failed',
  Cancelled: 'cancelled',
} as const;
export type QueueState = (typeof QueueState)[keyof typeof QueueState];
export const ModelUnits = { Millimetres: 'mm', Inches: 'in' } as const;
export type ModelUnits = (typeof ModelUnits)[keyof typeof ModelUnits];
export interface CheckSettings {
  readonly stlUnit: ModelUnits;
  readonly printer: {
    readonly name: string;
    readonly dimensions: readonly [number, number, number];
  } | null;
  readonly thicknessThresholdMm: number;
}

/** Exact coordinate welding makes shared topology meaningful across resolved 3MF objects. */
export function weldGeometry(
  source: IndexedTriangleGeometry,
): IndexedTriangleGeometry {
  const positions: number[] = [];
  const vertices = new Map<string, number>();
  const remap: number[] = [];
  for (let i = 0; i < source.positions.length; i += 3) {
    const point = [
      source.positions[i],
      source.positions[i + 1],
      source.positions[i + 2],
    ];
    if (!point.every(Number.isFinite)) {
      throw new Error('The mesh contains nonfinite coordinates.');
    }
    const key = point.join(':');
    let index = vertices.get(key);
    if (index === undefined) {
      index = positions.length / 3;
      vertices.set(key, index);
      positions.push(...point);
    }
    remap.push(index);
  }
  if (
    !source.indices.length ||
    source.indices.length % 3 ||
    source.indices.length / 3 > WorkflowLimits.Triangles
  ) {
    throw new Error(
      'Mesh is empty, malformed or exceeds the 100,000-triangle processing budget.',
    );
  }
  const indices = Array.from(source.indices, (index) => {
    if (index >= remap.length) {
      throw new Error('A triangle references a missing vertex.');
    }
    return remap[index];
  });
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}

export function checkGeometry(
  source: IndexedTriangleGeometry,
  settings: CheckSettings,
  scale = 1,
) {
  const mesh = weldGeometry({
    positions: source.positions.map((value) => value * scale),
    indices: source.indices,
  });
  const basic = inspectMesh(mesh);
  const edges = new Map<string, { direction: number; count: number }>();
  const parent = Array.from({ length: mesh.positions.length / 3 }, (_, i) => i);
  const root = (index: number): number => {
    let node = index;
    while (parent[node] !== node) {
      parent[node] = parent[parent[node]];
      node = parent[node];
    }
    return node;
  };
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const [a, b, c] = mesh.indices.slice(i, i + 3);
    for (const [from, to] of [
      [a, b],
      [b, c],
      [c, a],
    ]) {
      parent[root(to)] = root(from);
      const key = from < to ? `${from}:${to}` : `${to}:${from}`;
      const edge = edges.get(key) ?? { direction: 0, count: 0 };
      edge.count += 1;
      edge.direction += from < to ? 1 : -1;
      edges.set(key, edge);
    }
  }
  const shells = new Set(Array.from(mesh.indices, root)).size;
  const orientationConflicts = [...edges.values()].filter(
    (edge) => edge.count === 2 && edge.direction !== 0,
  ).length;
  const volumeValid =
    basic.volumeReliable &&
    !basic.duplicateTriangles &&
    !orientationConflicts &&
    shells === 1;
  const dimensions = meshDimensions(mesh);
  const d = [dimensions.width, dimensions.height, dimensions.depth];
  const bed = settings.printer?.dimensions;
  const permutations = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
  const fit = bed
    ? permutations.some((axes) => axes.every((axis, i) => d[axis] <= bed[i]))
    : null;
  const thickness = analyseWallThickness(
    { positions: mesh.positions.slice(), indices: mesh.indices.slice() },
    settings.thicknessThresholdMm,
    WallThicknessUnit.Millimetres,
  );
  return {
    dimensionsMm: dimensions,
    triangles: mesh.indices.length / 3,
    topology: {
      ...basic,
      volume: volumeValid ? basic.volume : null,
      volumeReliable: volumeValid,
      shells,
      orientationConflicts,
    },
    fit,
    thickness: thickness
      ? {
          method: 'Bounded triangle-centroid normal rays',
          samples: thickness.samples.length,
          measured: thickness.measured,
          unmeasured: thickness.unmeasured,
          belowThreshold: thickness.belowThreshold,
          minimumMm: thickness.minimum,
          thresholdMm: thickness.threshold,
        }
      : null,
    skipped: [
      'Self intersections and nested-shell solid interpretation are not checked.',
      'Slicer settings, supports, strength and actual print success are not checked.',
      ...(fit === null ? ['Printer fit skipped: no printer selected.'] : []),
      ...(thickness === null
        ? ['Wall sampling skipped: no supported result.']
        : []),
    ],
  };
}
export type GeometryCheck = ReturnType<typeof checkGeometry>;

export function bufferGeometry(mesh: IndexedTriangleGeometry): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(mesh.positions.slice(), 3),
  );
  geometry.setIndex(new BufferAttribute(mesh.indices.slice(), 1));
  return geometry;
}

function triangleArea(mesh: IndexedTriangleGeometry, triangle: number): number {
  const a = new Vector3().fromArray(
    mesh.positions,
    mesh.indices[triangle * 3] * 3,
  );
  const b = new Vector3().fromArray(
    mesh.positions,
    mesh.indices[triangle * 3 + 1] * 3,
  );
  const c = new Vector3().fromArray(
    mesh.positions,
    mesh.indices[triangle * 3 + 2] * 3,
  );
  return b.sub(a).cross(c.sub(a)).length() / 2;
}
export function meshSurfaceArea(mesh: IndexedTriangleGeometry): number {
  let area = 0;
  for (let i = 0; i < mesh.indices.length / 3; i++) {
    area += triangleArea(mesh, i);
  }
  return area;
}

/** Deterministic, area-distributed surface samples measured against target triangles. */
export function surfaceDifference(
  before: IndexedTriangleGeometry,
  after: IndexedTriangleGeometry,
  toleranceMm: number,
  count: number = WorkflowLimits.CompareSamples,
) {
  if (
    !(Number.isFinite(toleranceMm) && toleranceMm >= 0) ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > WorkflowLimits.CompareSamples
  ) {
    throw new Error(
      'Choose a finite nonnegative tolerance and a supported sample count.',
    );
  }
  const geometries = [
    bufferGeometry(weldGeometry(before)),
    bufferGeometry(weldGeometry(after)),
  ];
  try {
    const bvhs = geometries.map((geometry) => new MeshBVH(geometry));
    const sampleDirection = (
      source: IndexedTriangleGeometry,
      target: MeshBVH,
    ) => {
      const cumulative: number[] = [];
      let area = 0;
      for (let i = 0; i < source.indices.length / 3; i++) {
        area += triangleArea(source, i);
        cumulative.push(area);
      }
      if (!(area > 0)) {
        throw new Error('The mesh has no measurable surface area.');
      }
      const samples: { point: readonly number[]; distance: number }[] = [];
      let triangle = 0;
      for (let i = 0; i < count; i++) {
        const targetArea = ((i + 0.5) / count) * area;
        while (cumulative[triangle] < targetArea) {
          triangle += 1;
        }
        const u = Math.sqrt(((i + 1) * 0.754877666) % 1);
        const v = ((i + 1) * 0.569840291) % 1;
        const a = new Vector3().fromArray(
          source.positions,
          source.indices[triangle * 3] * 3,
        );
        const b = new Vector3().fromArray(
          source.positions,
          source.indices[triangle * 3 + 1] * 3,
        );
        const c = new Vector3().fromArray(
          source.positions,
          source.indices[triangle * 3 + 2] * 3,
        );
        const point = a
          .multiplyScalar(1 - u)
          .add(b.multiplyScalar(u * (1 - v)))
          .add(c.multiplyScalar(u * v));
        const hit = target.closestPointToPoint(point);
        if (!hit) {
          throw new Error('Surface distance could not be measured.');
        }
        samples.push({ point: point.toArray(), distance: hit.distance });
      }
      return samples;
    };
    const forward = sampleDirection(before, bvhs[1]);
    const reverse = sampleDirection(after, bvhs[0]);
    const distances = [...forward, ...reverse].map((sample) => sample.distance);
    return {
      method:
        'Bidirectional area-distributed surface sampling against triangle BVHs',
      samplesPerDirection: count,
      toleranceMm,
      maximumSampledMm: Math.max(...distances),
      meanSampledMm:
        distances.reduce((sum, value) => sum + value, 0) / distances.length,
      samplesOverTolerance: distances.filter(
        (distance) => distance > toleranceMm,
      ).length,
      forward,
      reverse,
    };
  } finally {
    geometries.forEach((geometry) => geometry.dispose());
  }
}
export type SurfaceDifference = ReturnType<typeof surfaceDifference>;

export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
