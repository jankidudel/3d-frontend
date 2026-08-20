import { calculateScale, convertLength, ModelUnit } from './stl-dimensions';

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
});
