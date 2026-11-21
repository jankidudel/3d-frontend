export type WallThicknessEngine = typeof import('./wall-thickness-engine');

/**
 * Loads the three.js-backed engine only when a model is analysed, so tool
 * landing pages do not download three.js before a file is chosen.
 */
export const loadWallThicknessEngine = (): Promise<WallThicknessEngine> =>
  import('./wall-thickness-engine');
