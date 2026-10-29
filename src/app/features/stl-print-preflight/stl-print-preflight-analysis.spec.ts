import { describe, expect, it } from 'vitest';
import { assessPrinterOrientations } from '../../shared/model-dimensions';
import {
  inspectMesh,
  preflightActions,
  preflightStatus,
  UNIT_AMBIGUITY_MESSAGE,
  WALL_THICKNESS_LIMITATION_MESSAGE,
} from './stl-print-preflight-analysis';

const closedTetrahedron = {
  encoding: 'binary STL' as const,
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]),
  indices: new Uint32Array([0, 2, 1, 0, 1, 3, 1, 2, 3, 2, 0, 3]),
};

describe('STL preflight analysis', () => {
  it('only presents volume as reliable for a closed, manifold mesh', () => {
    const report = inspectMesh(closedTetrahedron);
    expect(report.volumeReliable).toBe(true);
    expect(report.volume).toBeCloseTo(1 / 6);
  });

  it('maps mesh, fit and sampled-thickness findings to attention and links', () => {
    const damaged = inspectMesh({
      ...closedTetrahedron,
      indices: new Uint32Array([0, 1, 2]),
    });
    expect(preflightStatus(damaged, true, false)).toBe('Needs attention');
    expect(
      preflightActions(damaged, true, false, 600000).map(
        (action) => action.route,
      ),
    ).toEqual(
      expect.arrayContaining([
        '/tools/stl-repair',
        '/tools/stl-dimensions-checker',
        '/tools/stl-wall-thickness-checker',
        '/tools/stl-file-size-reducer',
      ]),
    );
  });

  it('keeps unit and sampled-thickness limitations explicit', () => {
    expect(UNIT_AMBIGUITY_MESSAGE).toContain('no declared unit');
    expect(WALL_THICKNESS_LIMITATION_MESSAGE).toContain('sampled');
  });

  it('treats sampled thin areas as a review, not a print-failure claim', () => {
    expect(preflightStatus(inspectMesh(closedTetrahedron), true, null)).toBe(
      'Check before slicing',
    );
  });

  it('finds a right-angle printer fit when the normal orientation does not fit', () => {
    const assessment = assessPrinterOrientations(
      { width: 250, height: 100, depth: 180 },
      'mm',
      { width: 220, height: 250, depth: 200 },
      'mm',
    );
    expect(assessment?.current.fit.fits).toBe(false);
    expect(assessment?.recommended?.fit.fits).toBe(true);
  });
});
