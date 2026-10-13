import { describe, expect, it } from 'vitest';
import { inspectMesh } from './stl-print-preflight-analysis';
import { findSelfIntersections } from './self-intersections';

function overlappingCubes() {
  const vertices = [
    [0, 0, 0],
    [2, 0, 0],
    [2, 2, 0],
    [0, 2, 0],
    [0, 0, 2],
    [2, 0, 2],
    [2, 2, 2],
    [0, 2, 2],
    [1, 0, 0],
    [3, 0, 0],
    [3, 2, 0],
    [1, 2, 0],
    [1, 0, 2],
    [3, 0, 2],
    [3, 2, 2],
    [1, 2, 2],
  ];
  const faces = [
    [0, 2, 1],
    [0, 3, 2],
    [4, 5, 6],
    [4, 6, 7],
    [0, 1, 5],
    [0, 5, 4],
    [1, 2, 6],
    [1, 6, 5],
    [2, 3, 7],
    [2, 7, 6],
    [3, 0, 4],
    [3, 4, 7],
  ];
  const indices = [...faces.flat(), ...faces.flat().map((index) => index + 8)];
  return {
    positions: new Float32Array(vertices.flat()),
    indices: new Uint32Array(indices),
  };
}

function mesh(vertices: readonly number[], indices?: readonly number[]) {
  return {
    positions: new Float32Array(vertices),
    indices: new Uint32Array(
      indices ??
        Array.from({ length: vertices.length / 3 }, (_, index) => index),
    ),
  };
}

describe('bounded BVH self-intersection screen', () => {
  it('finds crossing surfaces in two closed cubes with no open boundary edges', () => {
    const control = overlappingCubes();
    const topology = inspectMesh(control);
    const intersections = findSelfIntersections(control);
    expect(topology.openEdges).toBe(0);
    expect(topology.nonManifoldEdges).toBe(0);
    expect(topology.shells).toBe(2);
    expect(intersections.state).toBe('found');
    expect(
      intersections.findings.some((finding) => finding.kind === 'crossing'),
    ).toBe(true);
  });

  it('reports a transverse crossing without shared mesh vertices', () => {
    const report = findSelfIntersections(
      mesh([-1, 0, 0, 1, 0, 0, 0, 1, 0, 0, -1, -1, 0, 1, 1, 0, 1, -1]),
    );
    expect(report.state).toBe('found');
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].kind).toBe('crossing');
    expect(report.findings[0].triangles).toEqual([0, 1]);
  });

  it('does not report an ordinary shared-edge triangulation', () => {
    const report = findSelfIntersections(
      mesh([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], [0, 1, 2, 1, 3, 2]),
    );
    expect(report.state).toBe('complete');
    expect(report.findings).toHaveLength(0);
  });

  it('returns a completed zero result for near-contact triangles', () => {
    const report = findSelfIntersections(
      mesh([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0.001, 1, 0, 0.001, 0, 1, 0.001]),
    );
    expect(report.state).toBe('complete');
    expect(report.findings).toHaveLength(0);
  });

  it('reports exact duplicate faces as ambiguous', () => {
    const report = findSelfIntersections(
      mesh([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0]),
    );
    expect(report.state).toBe('found');
    expect(report.findings[0].kind).toBe('ambiguous');
  });

  it('returns a skipped state for malformed triangle arrays', () => {
    expect(
      findSelfIntersections({
        positions: new Float32Array([0, 0, 0]),
        indices: new Uint32Array([0, 1]),
      }).state,
    ).toBe('skipped');
  });

  it('keeps degenerate input incomplete instead of reporting a clean result', () => {
    expect(findSelfIntersections(mesh([0, 0, 0, 1, 0, 0, 2, 0, 0])).state).toBe(
      'incomplete',
    );
  });

  it('skips meshes above the declared triangle resource limit', () => {
    const report = findSelfIntersections({
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      indices: new Uint32Array(300_003),
    });
    expect(report.state).toBe('skipped');
    expect(report.reason).toContain('100,000');
  });
});
