import { checkGeometry, surfaceDifference } from './mesh-workflows';
import {
  MeshWorkerMode,
  MeshWorkerRequest,
  MeshWorkerResult,
} from './mesh-worker';
addEventListener('message', ({ data }: MessageEvent<MeshWorkerRequest>) => {
  try {
    const result: MeshWorkerResult =
      data.mode === MeshWorkerMode.Check
        ? { check: checkGeometry(data.mesh, data.settings, data.scale) }
        : {
            difference: surfaceDifference(
              data.before,
              data.after,
              data.tolerance,
            ),
          };
    postMessage(result);
  } catch (error: unknown) {
    postMessage({
      error: error instanceof Error ? error.message : 'Mesh processing failed.',
    });
  }
});
