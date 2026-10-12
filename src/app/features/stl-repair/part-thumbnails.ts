import {
  faceCoordinates,
  type PartAnalysis,
  type PartMesh,
} from './disconnected-parts';

export const PartThumbnailLimits = { PerPart: 512, Total: 30_000 } as const;
/** Bounded isometric shape samples, for identification rather than geometry proof.
 * Sampling keeps the original face/component mapping and never alters export.
 */
export function partThumbnails(
  mesh: PartMesh,
  analysis: PartAnalysis,
): string[] {
  const paths = Array.from({ length: analysis.parts.length }, () => '');
  const ordinals = new Uint32Array(analysis.parts.length);
  const samples = new Uint32Array(analysis.parts.length);
  const ranges = analysis.parts.map((part) => {
    const project = (x: number, y: number, z: number) => [
      x - z,
      -y + (x + z) * 0.3,
    ];
    const points = [0, 1].flatMap((x) =>
      [0, 1].flatMap((y) =>
        [0, 1].map((z) =>
          project(
            part.bounds[x ? 'max' : 'min'][0],
            part.bounds[y ? 'max' : 'min'][1],
            part.bounds[z ? 'max' : 'min'][2],
          ),
        ),
      ),
    );
    const min = [
      Math.min(...points.map((p) => p[0])),
      Math.min(...points.map((p) => p[1])),
    ];
    const max = [
      Math.max(...points.map((p) => p[0])),
      Math.max(...points.map((p) => p[1])),
    ];
    return {
      min,
      max,
      scale: 88 / Math.max(max[0] - min[0], max[1] - min[1], Number.MIN_VALUE),
    };
  });
  let total = 0;
  for (let face = 0; face < analysis.triangles; face++) {
    const id = analysis.faceParts[face];
    const count = Math.min(
      analysis.parts[id].triangles,
      PartThumbnailLimits.PerPart,
    );
    const ordinal = ordinals[id]++;
    if (
      total >= PartThumbnailLimits.Total ||
      samples[id] >= count ||
      ordinal !==
        Math.floor((samples[id] * analysis.parts[id].triangles) / count)
    ) {
      continue;
    }
    samples[id]++;
    total++;
    const { min, max, scale } = ranges[id];
    const values = faceCoordinates(mesh, face);
    const points: string[] = [];
    for (let corner = 0; corner < 3; corner++) {
      const x = values[corner * 3],
        y = values[corner * 3 + 1],
        z = values[corner * 3 + 2];
      const u = 50 + (x - z - (min[0] + max[0]) / 2) * scale;
      const v = 50 + (-y + (x + z) * 0.3 - (min[1] + max[1]) / 2) * scale;
      points.push(`${u.toFixed(1)},${v.toFixed(1)}`);
    }
    paths[id] += `M${points.join('L')}Z`;
  }
  return paths;
}
