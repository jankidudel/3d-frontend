import type { PartAnalysis } from './disconnected-parts';
export const PartsAction = { Analyse: 'analyse', Export: 'export' } as const;
export type PartsRequest =
  | { action: typeof PartsAction.Analyse; file: File }
  | { action: typeof PartsAction.Export; removed: number[] };
export interface PartsResponse {
  progress?: number;
  analysis?: PartAnalysis;
  thumbnails?: string[];
  positions?: Float32Array;
  normals?: Float32Array;
  blob?: Blob;
  error?: string;
}
