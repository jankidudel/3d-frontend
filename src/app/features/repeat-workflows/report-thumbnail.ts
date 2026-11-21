import { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-model';
const THUMBNAIL_WIDTH = 256;
const THUMBNAIL_HEIGHT = 180;
const MAX_THUMBNAIL_FACES = 750;
/** Fixed orthographic software preview; bounded sampled faces, never a geometry check. */
export function reportThumbnail(mesh: IndexedTriangleGeometry): string | null {
  if (typeof document === 'undefined' || !mesh.indices.length) {
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = THUMBNAIL_WIDTH;
  canvas.height = THUMBNAIL_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }
  const project = (vertex: number): readonly [number, number] => {
    const index = vertex * 3;
    const [x, y, z] = mesh.positions.slice(index, index + 3);
    return [(x - y) * 0.707106781, (x + y) * 0.40824829 - z * 0.816496581];
  };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const vertex of mesh.indices) {
    const [x, y] = project(vertex);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const scale = Math.min(
    (THUMBNAIL_WIDTH - 24) / Math.max(maxX - minX, 1e-8),
    (THUMBNAIL_HEIGHT - 24) / Math.max(maxY - minY, 1e-8),
  );
  const offsetX = (THUMBNAIL_WIDTH - (maxX - minX) * scale) / 2;
  const offsetY = (THUMBNAIL_HEIGHT - (maxY - minY) * scale) / 2;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);
  context.strokeStyle = '#173c55';
  context.lineWidth = 0.7;
  const faces = mesh.indices.length / 3;
  const count = Math.min(faces, MAX_THUMBNAIL_FACES);
  for (let sample = 0; sample < count; sample++) {
    const face = Math.floor((sample * faces) / count) * 3;
    context.beginPath();
    for (let corner = 0; corner < 3; corner++) {
      const [x, y] = project(mesh.indices[face + corner]);
      if (corner === 0) {
        context.moveTo(
          offsetX + (x - minX) * scale,
          offsetY + (y - minY) * scale,
        );
      } else {
        context.lineTo(
          offsetX + (x - minX) * scale,
          offsetY + (y - minY) * scale,
        );
      }
    }
    context.closePath();
    context.stroke();
  }
  return canvas.toDataURL('image/png');
}
