import { describe, expect, it } from 'vitest';
import { MeshIntegrityReport } from '../stl-print-preflight/stl-print-preflight-analysis';
import {
  threeMfPreflightActions,
  threeMfPreflightStatus,
} from './three-mf-print-preflight-analysis';

const cleanIntegrity: MeshIntegrityReport = {
  openEdges: 0,
  nonManifoldEdges: 0,
  degenerateTriangles: 0,
  duplicateTriangles: 0,
  volume: 12,
  volumeReliable: true,
  shells: 1,
  orientationConflicts: 0,
};

describe('3MF print preflight analysis', () => {
  it('keeps a missing explicit unit as a review item without STL ambiguity wording', () => {
    expect(threeMfPreflightStatus(cleanIntegrity, false, true, true)).toBe(
      'Check before slicing',
    );
  });

  it('maps resolved-build findings to the specific next tools', () => {
    const actions = threeMfPreflightActions(
      { ...cleanIntegrity, openEdges: 2, volume: null, volumeReliable: false },
      true,
      false,
      600000,
    );
    expect(actions.map((action) => action.route)).toEqual(
      expect.arrayContaining([
        '/3mf-repair',
        '/3mf-dimensions-checker',
        '/3mf-wall-thickness-checker',
        '/3mf-triangle-counter',
        '/3mf-to-stl-converter',
      ]),
    );
  });

  it('requires a reliable closed manifold mesh before presenting an all-clear status', () => {
    expect(
      threeMfPreflightStatus(
        {
          ...cleanIntegrity,
          nonManifoldEdges: 1,
          volume: null,
          volumeReliable: false,
        },
        false,
        true,
        false,
      ),
    ).toBe('Needs attention');
  });
});
