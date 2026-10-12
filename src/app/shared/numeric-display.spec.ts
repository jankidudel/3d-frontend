import { displayNumber } from './numeric-display';
describe('human numeric display', () => {
  it('removes Float32 noise without changing numbers', () => {
    expect(displayNumber(25.39999771118164)).toBe('25.4');
    expect(displayNumber(50.79999923706055)).toBe('50.8');
    expect(displayNumber(-40)).toBe('-40');
    expect(displayNumber(-0)).toBe('0');
    expect(displayNumber(0)).toBe('0');
    expect(displayNumber(0.000003814697265625, true)).toBe('3.81e-6');
    expect(displayNumber(-0.000003814697265625)).toBe('-3.81e-6');
    expect(displayNumber(1e20)).toBe('1e+20');
    expect(displayNumber(Number.MAX_VALUE)).toBe('1.8e+308');
    expect(displayNumber(Number.MIN_VALUE)).toBe('4.94e-324');
    for (const value of [null, undefined, Infinity, NaN]) {
      expect(displayNumber(value)).toBe('Unavailable');
    }
  });
  it('never changes a boundary decision or JSON precision', () => {
    const minimum = -0.0000001;
    const maximum = 20.0000001;
    expect(displayNumber(maximum)).toBe('20');
    expect(maximum > 20).toBe(true);
    expect(minimum < 0).toBe(true);
    expect(displayNumber(minimum)).toBe('-1e-7');
    expect(JSON.parse(JSON.stringify({ minimum, maximum }))).toEqual({
      minimum,
      maximum,
    });
  });
});
