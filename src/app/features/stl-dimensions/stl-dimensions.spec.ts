import {
  calculateBuildVolumeFit,
  calculateScale,
  convertLength,
  ModelUnit,
} from './stl-dimensions';

describe('STL dimension calculations', () => {
  it('converts between millimetres, centimetres, metres and inches', () => {
    expect(convertLength(50, 'mm', 'cm')).toBeCloseTo(5);
    expect(convertLength(50, 'mm', 'm')).toBeCloseTo(0.05);
    expect(convertLength(50, 'mm', 'in')).toBeCloseTo(1.9685039);
    expect(convertLength(2, 'in', 'mm')).toBeCloseTo(50.8);
  });

  it.each([
    ['mm', 1],
    ['cm', 10],
    ['m', 1000],
    ['in', 25.4],
  ] satisfies [ModelUnit, number][])(
    'converts from %s source units',
    (unit, mm) => {
      expect(convertLength(1, unit, 'mm')).toBeCloseTo(mm);
    },
  );

  it('calculates scale factor, percentage and proportional dimensions', () => {
    const result = calculateScale(
      { width: 50, height: 100, depth: 25 },
      'mm',
      'height',
      20,
      'cm',
    );

    expect(result?.factor).toBeCloseTo(2);
    expect(result?.percentage).toBeCloseTo(200);
    expect(result?.dimensions).toEqual({ width: 10, height: 20, depth: 5 });
  });

  it('accounts for different model and desired units', () => {
    const result = calculateScale(
      { width: 2, height: 4, depth: 1 },
      'in',
      'width',
      101.6,
      'mm',
    );

    expect(result?.factor).toBeCloseTo(2);
    expect(result?.dimensions.width).toBeCloseTo(101.6);
    expect(result?.dimensions.height).toBeCloseTo(203.2);
    expect(result?.dimensions.depth).toBeCloseTo(50.8);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid desired size %s',
    (desiredSize) => {
      expect(
        calculateScale(
          { width: 10, height: 20, depth: 30 },
          'mm',
          'width',
          desiredSize,
          'mm',
        ),
      ).toBeNull();
    },
  );

  it('rejects a zero target model dimension and overflowing results', () => {
    expect(
      calculateScale(
        { width: 0, height: 20, depth: 30 },
        'mm',
        'width',
        10,
        'mm',
      ),
    ).toBeNull();
    expect(
      calculateScale(
        { width: 1, height: Number.MAX_VALUE, depth: 1 },
        'mm',
        'width',
        Number.MAX_VALUE,
        'm',
      ),
    ).toBeNull();
  });

  describe('printer build-volume fit', () => {
    it('recognises an exact fit', () => {
      const result = calculateBuildVolumeFit(
        { width: 220, height: 220, depth: 250 },
        'mm',
        { width: 220, height: 220, depth: 250 },
        'mm',
      );

      expect(result?.fits).toBe(true);
      expect(result?.maximumScalePercentage).toBeCloseTo(100);
      expect(result?.dimensions.width.exceededBy).toBe(0);
    });

    it('recognises spare build volume and reports theoretical scale-up', () => {
      const result = calculateBuildVolumeFit(
        { width: 100, height: 100, depth: 100 },
        'mm',
        { width: 200, height: 300, depth: 400 },
        'mm',
      );

      expect(result?.fits).toBe(true);
      expect(result?.maximumScalePercentage).toBeCloseTo(200);
      expect(result?.scaledDimensions).toEqual({
        width: 200,
        height: 200,
        depth: 200,
      });
    });

    it('identifies one exceeded dimension', () => {
      const result = calculateBuildVolumeFit(
        { width: 230, height: 190, depth: 200 },
        'mm',
        { width: 220, height: 220, depth: 250 },
        'mm',
      );

      expect(result?.fits).toBe(false);
      expect(result?.dimensions.width.exceededBy).toBeCloseTo(10);
      expect(result?.dimensions.height.fits).toBe(true);
      expect(result?.dimensions.depth.fits).toBe(true);
    });

    it('identifies multiple exceeded dimensions and the limiting scale', () => {
      const result = calculateBuildVolumeFit(
        { width: 230, height: 190, depth: 260 },
        'mm',
        { width: 220, height: 220, depth: 250 },
        'mm',
      );

      expect(result?.fits).toBe(false);
      expect(result?.dimensions.width.exceededBy).toBeCloseTo(10);
      expect(result?.dimensions.depth.exceededBy).toBeCloseTo(10);
      expect(result?.maximumScalePercentage).toBeCloseTo(95.6521739);
      expect(result?.scaledDimensions.width).toBeCloseTo(220);
      expect(result?.scaledDimensions.height).toBeCloseTo(181.73913);
      expect(result?.scaledDimensions.depth).toBeCloseTo(248.69565);
    });

    it('compares model and build dimensions supplied in different units', () => {
      const result = calculateBuildVolumeFit(
        { width: 10, height: 5, depth: 2 },
        'cm',
        { width: 4, height: 3, depth: 1 },
        'in',
      );

      expect(result?.fits).toBe(true);
      expect(result?.dimensions.width.model).toBeCloseTo(3.9370079);
      expect(result?.dimensions.depth.model).toBeCloseTo(0.7874016);
    });

    it('produces consistent comparisons when the model unit changes', () => {
      const fromMillimetres = calculateBuildVolumeFit(
        { width: 230, height: 190, depth: 260 },
        'mm',
        { width: 220, height: 220, depth: 250 },
        'mm',
      );
      const fromCentimetres = calculateBuildVolumeFit(
        { width: 23, height: 19, depth: 26 },
        'cm',
        { width: 220, height: 220, depth: 250 },
        'mm',
      );

      expect(fromCentimetres?.fits).toBe(fromMillimetres?.fits);
      expect(fromCentimetres?.maximumScalePercentage).toBeCloseTo(
        fromMillimetres?.maximumScalePercentage ?? 0,
      );
      expect(fromCentimetres?.dimensions).toEqual(fromMillimetres?.dimensions);
    });

    it.each([
      [
        { width: 0, height: 10, depth: 10 },
        { width: 20, height: 20, depth: 20 },
      ],
      [
        { width: 10, height: 10, depth: 10 },
        { width: 0, height: 20, depth: 20 },
      ],
      [
        { width: Number.NaN, height: 10, depth: 10 },
        { width: 20, height: 20, depth: 20 },
      ],
    ])('rejects invalid or zero model/build dimensions', (model, build) => {
      expect(calculateBuildVolumeFit(model, 'mm', build, 'mm')).toBeNull();
    });
  });
});
