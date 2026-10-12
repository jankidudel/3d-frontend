import { geometryBounds } from '../shared/wall-thickness/three-mf-wall-thickness';
import { topologyReview } from './candidate-review';
import { reviewedCandidate, type ReductionMethod } from './candidate-review';
import { readStl, type StlMesh } from './stl-reducer';
addEventListener(
  'message',
  async ({
    data,
  }: MessageEvent<{
    file?: File;
    source?: StlMesh;
    method: ReductionMethod;
    keepPercent: number;
    requestedTriangles?: number;
  }>) => {
    try {
      if (data.file) {
        const mesh = await readStl(data.file);
        postMessage({
          mesh,
          bounds: geometryBounds(mesh),
          topology: topologyReview(mesh),
        });
      } else if (data.source) {
        postMessage({
          candidate: await reviewedCandidate(
            data.source,
            data.method,
            data.keepPercent,
            data.requestedTriangles,
          ),
        });
      }
    } catch (error: unknown) {
      postMessage({
        error:
          error instanceof Error
            ? error.message
            : 'Candidate processing failed.',
      });
    }
  },
);
