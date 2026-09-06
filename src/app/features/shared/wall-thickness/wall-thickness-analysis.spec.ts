import { describe, expect, it } from 'vitest';
import {
  analyseWallThickness,
  sampleTriangleIndices,
  WallThicknessUnit,
} from './wall-thickness-analysis';
import {
  classifyWallThicknessSample,
  createWallThicknessHeatmap,
  WallThicknessSampleClass,
} from './wall-thickness-heatmap';
import { roundedThickness } from './wall-thickness-result';

const tetrahedron = {
  positions: new Float32Array([0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4]),
  indices: new Uint32Array([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]),
};

describe('wall thickness analysis', () => {
  it('is deterministic, bounded and does not mutate indexed input', () => {
    const positions = tetrahedron.positions.slice();
    const indices = tetrahedron.indices.slice();
    expect(sampleTriangleIndices(10_000, 20)).toEqual(
      sampleTriangleIndices(10_000, 20),
    );
    expect(sampleTriangleIndices(10_000, 20)).toHaveLength(20);
    analyseWallThickness(tetrahedron, 1.2, WallThicknessUnit.Millimetres);
    expect(tetrahedron.positions).toEqual(positions);
    expect(tetrahedron.indices).toEqual(indices);
  });
  it('classifies thresholds and creates a separate vertex-coloured heatmap', () => {
    const report = analyseWallThickness(
      tetrahedron,
      1.2,
      WallThicknessUnit.Millimetres,
    );
    expect(report).not.toBeNull();
    if (!report) {
      throw new Error('expected report');
    }
    expect(
      classifyWallThicknessSample({ triangle: 0, thickness: 1.1 }, 1.2),
    ).toBe(WallThicknessSampleClass.Below);
    expect(
      classifyWallThicknessSample({ triangle: 0, thickness: 1.3 }, 1.2),
    ).toBe(WallThicknessSampleClass.Near);
    expect(
      classifyWallThicknessSample({ triangle: 0, thickness: null }, 1.2),
    ).toBe(WallThicknessSampleClass.Unmeasured);
    expect(
      createWallThicknessHeatmap(tetrahedron, report).children,
    ).toHaveLength(1);
    expect(roundedThickness(1.234)).toBe('1.23');
  });
});
