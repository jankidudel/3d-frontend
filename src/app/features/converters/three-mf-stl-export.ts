import {
  geometryBounds,
  resolveThreeMfWallGeometry,
  type ResolvedThreeMfGeometry,
  type GeometryBounds,
} from '../shared/wall-thickness/three-mf-wall-thickness';
import type { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-model';
import { readStl, writeBinaryStl } from '../stl-reducer/stl-reducer';

export const CoordinatePolicy = {
  Preserve: 'Preserve resolved placement',
  Origin: 'Translate minimum corner to origin',
} as const;
export type CoordinatePolicy =
  (typeof CoordinatePolicy)[keyof typeof CoordinatePolicy];
export interface ExportOptions {
  readonly itemId?: string;
  readonly coordinatePolicy?: CoordinatePolicy;
  readonly sourceName?: string;
}
export interface ThreeMfExportReport {
  readonly methodVersion: string;
  readonly source: {
    readonly name: string;
    readonly bytes: number;
    readonly declaredUnit: string;
    readonly displayedUnit: string;
    readonly modelPart: string;
  };
  readonly resolutionStatus: string;
  readonly limitations: readonly string[];
  readonly scope: string;
  readonly placedItems: readonly {
    readonly id: string;
    readonly resourceId: string;
    readonly originalPlacement: readonly number[];
  }[];
  readonly coordinatePolicy: CoordinatePolicy;
  readonly translationMm: readonly number[];
  readonly expectedBoundsMm: GeometryBounds;
  readonly exportedBoundsMm: GeometryBounds;
  readonly reopenedBoundsMm: GeometryBounds;
  readonly expectedTriangles: number;
  readonly reopenedTriangles: number;
  readonly verification: {
    readonly passed: boolean;
    readonly method: string;
    readonly toleranceMm: number;
    readonly maximumFloat32ErrorMm: number;
    readonly sourceFloat32ErrorMm: number;
  };
  readonly nextAction: string;
}
/** Compare every triangle, retaining multiplicity and winding; cyclic vertex order is allowed. */
export function canonicalTriangles(
  geometry: IndexedTriangleGeometry,
): string[] {
  const triangles: string[] = [];
  for (let index = 0; index < geometry.indices.length; index += 3) {
    const points = Array.from(
      geometry.indices.slice(index, index + 3),
      (vertex) =>
        Array.from(
          geometry.positions.slice(vertex * 3, vertex * 3 + 3),
          (value) => (Object.is(value, -0) ? 0 : Math.fround(value)),
        ).join(','),
    );
    triangles.push(
      [
        points.join('|'),
        [points[1], points[2], points[0]].join('|'),
        [points[2], points[0], points[1]].join('|'),
      ].sort()[0],
    );
  }
  return triangles.sort();
}
export function verifyStlGeometry(
  expected: IndexedTriangleGeometry,
  reopened: IndexedTriangleGeometry,
): boolean {
  const a = canonicalTriangles(expected);
  const b = canonicalTriangles(reopened);
  return (
    a.length === b.length && a.every((triangle, index) => triangle === b[index])
  );
}
export function exportGeometry(
  resolved: ResolvedThreeMfGeometry,
  options: ExportOptions = {},
) {
  const selected = options.itemId
    ? resolved.items.find((item) => item.id === options.itemId)
    : undefined;
  if (options.itemId && !selected) {
    throw new Error(
      'The chosen placed item is no longer available. Select the scope again.',
    );
  }
  const source = selected?.geometry ?? resolved.geometry;
  const before = geometryBounds(source);
  const policy = options.coordinatePolicy ?? CoordinatePolicy.Preserve;
  const offset = before.min.map((value) =>
    policy === CoordinatePolicy.Origin && value !== 0 ? -value : 0,
  );
  let maximumError = 0;
  const positions = new Float32Array(source.positions.length);
  for (let index = 0; index < positions.length; index++) {
    const intended = source.positions[index] + offset[index % 3];
    positions[index] = intended;
    maximumError = Math.max(
      maximumError,
      Math.abs(intended - positions[index]),
    );
  }
  const geometry = { positions, indices: source.indices };
  const bounds = geometryBounds(geometry);
  // Half an ULP at the largest coordinate, with a small numerical floor.
  const coordinateScale = Math.max(
    ...bounds.min.map(Math.abs),
    ...bounds.max.map(Math.abs),
    1,
  );
  const tolerance = Math.max(
    1e-7,
    2 ** (Math.floor(Math.log2(coordinateScale)) - 24),
  );
  if (maximumError > tolerance || tolerance > 0.01) {
    throw new Error(
      'Float32 coordinates cannot substantiate a check within 0.01 mm. Re-export nearer the origin in the original application.',
    );
  }
  return {
    geometry,
    before,
    bounds,
    offset,
    policy,
    maximumError,
    tolerance,
    selected,
  };
}
export async function serializeThreeMfScope(
  resolved: ResolvedThreeMfGeometry,
  sourceBytes: number,
  options: ExportOptions = {},
) {
  const prepared = exportGeometry(resolved, options);
  const blob = writeBinaryStl({ ...prepared.geometry, encoding: 'binary STL' });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const reopened = await readStl(
    new File([bytes.slice().buffer], 'verification.stl'),
  );
  const passed = verifyStlGeometry(prepared.geometry, reopened);
  if (!passed) {
    throw new Error(
      'Export verification failed: reopened triangles differ from the intended Float32 geometry. No successful download is offered.',
    );
  }
  const report: ThreeMfExportReport = {
    methodVersion:
      'inspectmesh-3mf-export-1 / core-geometry-1 (3MF Core 1.4.0)',
    source: {
      name: options.sourceName ?? 'Source 3MF',
      bytes: sourceBytes,
      declaredUnit: resolved.declaredUnit,
      displayedUnit: 'millimetres',
      modelPart: resolved.modelPart,
    },
    resolutionStatus: resolved.status,
    limitations: resolved.limitations,
    scope: prepared.selected
      ? `One top-level placed item: ${prepared.selected.id}`
      : 'Entire supported placed build',
    placedItems: (prepared.selected ? [prepared.selected] : resolved.items).map(
      (item) => ({
        id: item.id,
        resourceId: item.resourceId,
        originalPlacement: item.transform,
      }),
    ),
    coordinatePolicy: prepared.policy,
    translationMm: prepared.offset,
    expectedBoundsMm: prepared.before,
    exportedBoundsMm: prepared.bounds,
    reopenedBoundsMm: geometryBounds(reopened),
    expectedTriangles: prepared.geometry.indices.length / 3,
    reopenedTriangles: reopened.indices.length / 3,
    verification: {
      passed,
      method:
        'Reopen exact serialized bytes with the repository STL parser; compare every oriented triangle after Float32 rounding, allowing cyclic vertex order. Count and bounds are also reported. Tolerance describes Float32 rounding, not a surface or printability guarantee.',
      toleranceMm: prepared.tolerance,
      maximumFloat32ErrorMm: prepared.maximumError,
      sourceFloat32ErrorMm: resolved.sourceFloat32ErrorMm,
    },
    nextAction:
      'Retain the original 3MF. Reopen the downloaded STL in the destination application, select millimetres and check a known dimension and placement. STL has no unit declaration.',
  };
  return {
    bytes,
    report,
    result: {
      triangles: report.expectedTriangles,
      sourceUnit: resolved.declaredUnit,
      dimensions: prepared.bounds.spans as readonly [number, number, number],
    },
  };
}
/** Compatibility entry point used by owned collection controls. */
export async function convertThreeMfToStl(
  data: ArrayBuffer,
  options: ExportOptions = {},
) {
  return serializeThreeMfScope(
    await resolveThreeMfWallGeometry(data),
    data.byteLength,
    options,
  );
}
