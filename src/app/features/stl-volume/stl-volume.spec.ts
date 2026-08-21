import { calculateMaterialEstimate, convertVolume } from './stl-volume';

describe('STL volume calculations', () => {
  it('converts cubic mm, cm, ml and inches', () => {
    expect(convertVolume(1000, 'mm', 'cm')).toBeCloseTo(1);
    expect(convertVolume(1, 'cm', 'mm')).toBeCloseTo(1000);
    expect(convertVolume(1, 'in', 'cm')).toBeCloseTo(16.387064);
    expect(convertVolume(16.387064, 'cm', 'in')).toBeCloseTo(1);
  });

  it.each([
    ['mm', 1],
    ['cm', 1000],
    ['m', 1_000_000_000],
    ['in', 16_387.064],
  ] as const)(
    'converts one cubic %s model unit into %d cubic millimetres',
    (unit, expectedCubicMillimetres) => {
      expect(convertVolume(1, unit, 'mm')).toBeCloseTo(
        expectedCubicMillimetres,
      );
    },
  );

  it.each([
    [0, 12.4, 0],
    [15, 12.4, 1.86],
    [100, 12.4, 12.4],
  ])(
    'calculates a material estimate at %d%% infill',
    (infillPercentage, expectedSolidMass, expectedInfillMass) => {
      const estimate = calculateMaterialEstimate(10, 1.24, infillPercentage);

      expect(estimate?.solidMassGrams).toBeCloseTo(expectedSolidMass);
      expect(estimate?.infillMassGrams).toBeCloseTo(expectedInfillMass);
    },
  );

  it.each([
    [10, 0, 15],
    [10, -1, 15],
    [10, Number.NaN, 15],
    [10, 1.24, -1],
    [10, 1.24, 101],
    [Number.NaN, 1.24, 15],
  ])(
    'rejects invalid density, infill and volume',
    (volume, density, infill) => {
      expect(calculateMaterialEstimate(volume, density, infill)).toBeNull();
    },
  );
});
