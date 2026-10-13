import { findSelfIntersections } from './self-intersections';
import { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-analysis';

addEventListener(
  'message',
  ({ data }: MessageEvent<IndexedTriangleGeometry>) => {
    postMessage(findSelfIntersections(data));
  },
);
