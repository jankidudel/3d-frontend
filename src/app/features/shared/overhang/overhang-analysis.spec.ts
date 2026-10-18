import {
  analyseOverhangs,
  OverhangBuildDirection,
  overhangBuildDirection,
} from './overhang-analysis';
import { describe, expect, it } from 'vitest';

describe('analyseOverhangs', () => {
  const downwardTriangle = {
    positions: new Float32Array([0, 0, 0, 0, 1, 0, 1, 0, 0]),
    indices: new Uint32Array([0, 1, 2]),
  };

  it('uses vertex winding and a strict threshold boundary', () => {
    const angledTriangle = {
      positions: new Float32Array([0, 0, 0, 0, 1, -1, 1, 0, 0]),
      indices: new Uint32Array([0, 1, 2]),
    };
    const exact = analyseOverhangs(angledTriangle, 45);
    const below = analyseOverhangs(angledTriangle, 44.9);
    const reversed = analyseOverhangs(
      {
        ...downwardTriangle,
        indices: new Uint32Array([0, 2, 1]),
      },
      45,
    );

    expect(exact?.flaggedCount).toBe(0);
    expect(below?.flaggedCount).toBe(1);
    expect(reversed?.flaggedCount).toBe(0);
  });

  it('does not include degenerate triangles in the area denominator', () => {
    const report = analyseOverhangs(
      {
        positions: new Float32Array([
          0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 0, 0, 2, 0, 0, 2, 0, 0,
        ]),
        indices: new Uint32Array([0, 1, 2, 3, 4, 5]),
      },
      45,
    );

    expect(report?.analysedTriangleCount).toBe(1);
    expect(report?.degenerateTriangleCount).toBe(1);
    expect(report?.totalArea).toBeCloseTo(0.5);
    expect(report?.flaggedPercentage).toBe(100);
  });

  it('normalises a changed build direction', () => {
    const report = analyseOverhangs(downwardTriangle, 45, [0, 0, 8]);
    expect(report?.buildDirection).toEqual([0, 0, 1]);
    expect(
      overhangBuildDirection(OverhangBuildDirection.NegativeX).direction,
    ).toEqual([-1, 0, 0]);
  });
});
