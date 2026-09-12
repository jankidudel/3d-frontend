import { planOrientations } from './orientation-planner-analysis';

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
  });

  it('prioritises directions that fit the saved printer profile', () => {
    const plans = planOrientations(mesh, 45, 'mm', {
      width: 2,
      height: 1,
      depth: 1,
      unit: 'mm',
    });

    expect(plans[0].fit?.fits).toBe(true);
    expect(plans.some((plan) => plan.fit?.fits === false)).toBe(true);
  });
});
