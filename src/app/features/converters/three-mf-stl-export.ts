import { resolveThreeMfWallGeometry } from '../shared/wall-thickness/three-mf-wall-thickness';
import { writeBinaryStl } from '../stl-reducer/stl-reducer';
import { meshDimensions } from '../stl-print-preflight/stl-print-preflight-analysis';

/** Geometry-only export in millimetres, after supported units and placements resolve. */
export async function convertThreeMfToStl(data: ArrayBuffer) {
  const resolved = await resolveThreeMfWallGeometry(data);
  const geometry = resolved.geometry;
  const dimensions = meshDimensions(geometry);
  const blob = writeBinaryStl({ ...geometry, encoding: 'binary STL' });
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    result: {
      triangles: geometry.indices.length / 3,
      sourceUnit: resolved.declaredUnit,
      dimensions: [
        dimensions.width,
        dimensions.height,
        dimensions.depth,
      ] as const,
    },
  };
}
