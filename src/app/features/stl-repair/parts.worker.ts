import { partThumbnails } from './part-thumbnails';
import {
  analyseParts,
  exportParts,
  parsePartStl,
  type PartMesh,
  type PartAnalysis,
} from './disconnected-parts';
import { PartsAction, type PartsRequest } from './parts-worker';
let mesh: PartMesh | null = null;
let analysis: PartAnalysis | null = null;
addEventListener('message', async ({ data }: MessageEvent<PartsRequest>) => {
  try {
    if (data.action === PartsAction.Analyse) {
      mesh = null;
      analysis = null;
      postMessage({ progress: 0 });
      mesh = parsePartStl(await data.file.arrayBuffer());
      analysis = analyseParts(mesh, (progress) => postMessage({ progress }));
      const thumbnails = partThumbnails(mesh, analysis);
      const positions = new Float32Array(mesh.positions);
      const normals = new Float32Array(positions.length);
      for (let offset = 0; offset < positions.length; offset += 9) {
        const ux = mesh.positions[offset + 3] - mesh.positions[offset],
          uy = mesh.positions[offset + 4] - mesh.positions[offset + 1],
          uz = mesh.positions[offset + 5] - mesh.positions[offset + 2];
        const vx = mesh.positions[offset + 6] - mesh.positions[offset],
          vy = mesh.positions[offset + 7] - mesh.positions[offset + 1],
          vz = mesh.positions[offset + 8] - mesh.positions[offset + 2];
        const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
        const length = Math.hypot(...n);
        for (let corner = 0; corner < 3; corner++) {
          for (let axis = 0; axis < 3; axis++) {
            normals[offset + corner * 3 + axis] = n[axis] / length;
          }
        }
      }
      const mapping = analysis.faceParts.slice();
      postMessage(
        {
          analysis: { ...analysis, faceParts: mapping },
          positions,
          normals,
          thumbnails,
        },
        { transfer: [positions.buffer, normals.buffer, mapping.buffer] },
      );
    } else {
      if (!mesh || !analysis) {
        throw new Error('Analyse the selected file before exporting.');
      }
      const removed =
        data.keepPartId === undefined
          ? data.removed
          : analysis.parts
              .filter((part) => part.id !== data.keepPartId)
              .map((part) => part.id);
      postMessage({
        blob: await exportParts(mesh, analysis, removed),
        keepPartId: data.keepPartId,
      });
    }
  } catch (error: unknown) {
    postMessage({
      error:
        error instanceof Error
          ? error.message
          : 'Part processing failed. Select the file again to retry.',
    });
  }
});
