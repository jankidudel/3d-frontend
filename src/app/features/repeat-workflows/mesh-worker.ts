import type { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-analysis';
import type {
  CheckSettings,
  GeometryCheck,
  SurfaceDifference,
} from './mesh-workflows';
export const MeshWorkerMode = { Check: 'check', Compare: 'compare' } as const;
export type MeshWorkerRequest =
  | {
      mode: typeof MeshWorkerMode.Check;
      mesh: IndexedTriangleGeometry;
      settings: CheckSettings;
      scale: number;
    }
  | {
      mode: typeof MeshWorkerMode.Compare;
      before: IndexedTriangleGeometry;
      after: IndexedTriangleGeometry;
      tolerance: number;
    };
export interface MeshWorkerResult {
  check?: GeometryCheck;
  difference?: SurfaceDifference;
  error?: string;
}
export function runMeshWorker(
  request: MeshWorkerRequest,
  signal: AbortSignal,
): Promise<MeshWorkerResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./mesh-analysis.worker', import.meta.url),
      { type: 'module' },
    );
    const cleanup = () => {
      signal.removeEventListener('abort', cancel);
      worker.terminate();
    };
    const cancel = () => {
      cleanup();
      reject(new DOMException('Processing cancelled.', 'AbortError'));
    };
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) {
      cancel();
      return;
    }
    worker.onmessage = ({ data }: MessageEvent<MeshWorkerResult>) => {
      cleanup();
      if (data.error) {
        reject(new Error(data.error));
      } else {
        resolve(data);
      }
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error('The mesh worker could not complete this file.'));
    };
    worker.postMessage(request);
  });
}
