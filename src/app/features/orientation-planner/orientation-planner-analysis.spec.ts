import {
  planOrientations,
  printerProfileAfterEdgeAllowance,
} from './orientation-planner-analysis';
import { describe, expect, it } from 'vitest';

describe('planOrientations', () => {
  const mesh = {
    positions: new Float32Array([
      0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 1, 2, 0, 1, 0, 1, 1,
    ]),
    indices: new Uint32Array([0, 1, 2, 3, 5, 4]),
  };

  it('compares six axial build directions without a printer profile', () => {
    const plans = planOrientations(mesh, 45, 'mm', null);

    expect(plans).toHaveLength(6);
    expect(plans.every((plan) => plan.fit === null)).toBe(true);
    expect(plans.every((plan) => plan.overhang.flaggedPercentage >= 0)).toBe(
      true,
    );
    expect(plans.map((plan) => plan.sourceAxisUp)).toEqual([
      '+Z',
      '-Z',
      '+X',
      '-X',
      '+Y',
      '-Y',
    ]);
    expect(plans[0].transform).toBe('Keep the source rotation');
  });

  it('reports fit without reordering the source-axis candidates', () => {
    const plans = planOrientations(mesh, 45, 'mm', {
      width: 2,
      height: 1,
      depth: 1,
      unit: 'mm',
    });

    expect(plans[0].sourceAxisUp).toBe('+Z');
    expect(plans.some((plan) => plan.fit?.fits === false)).toBe(true);
  });

  it('deducts an edge allowance from both sides of printer X and Y only', () => {
    const adjusted = printerProfileAfterEdgeAllowance(
      { width: 220, height: 260, depth: 200, unit: 'mm' },
      5,
    );

    expect(adjusted).toEqual({
      width: 210,
      height: 250,
      depth: 200,
      unit: 'mm',
    });
    expect(
      printerProfileAfterEdgeAllowance(
        { width: 10, height: 10, depth: 10, unit: 'mm' },
        5,
      ),
    ).toBeNull();
  });

  it('maps unequal source spans to candidate X, Y and Z envelopes', () => {
    const box = {
      positions: new Float32Array([
        -2, 3, 5, 38, 3, 5, -2, 28, 5, -2, 3, 17, 38, 28, 17,
      ]),
      indices: new Uint32Array([0, 1, 2, 0, 3, 1, 1, 3, 4]),
    };
    const plans = planOrientations(box, 45, 'mm', null);

    expect(plans[0].dimensions).toEqual({ width: 40, height: 25, depth: 12 });
    expect(plans[2].dimensions).toEqual({ width: 25, height: 12, depth: 40 });
    expect(plans[4].dimensions).toEqual({ width: 40, height: 12, depth: 25 });
  });

  it('does not double-count an exact duplicate contact triangle', () => {
    const duplicate = {
      positions: new Float32Array([
        0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 1,
      ]),
      indices: new Uint32Array([0, 2, 1, 3, 5, 4, 6, 6, 6]),
    };
    const current = planOrientations(duplicate, 45, 'mm', null)[0];

    expect(current.bedContactArea).toBeCloseTo(2);
    expect(current.overhang.degenerateTriangleCount).toBe(1);
  });
});
