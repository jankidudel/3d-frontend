import {
  spoolSufficiency,
  wallPlan,
  volumetricPlan,
  zonedStart,
  finishTime,
  TimeOccurrence,
} from './planning-calculations';

describe('partial spools', () => {
  it('subtracts tare and reserve, counts whole copies and reports shortfall', () => {
    expect(spoolSufficiency(350, 200, 20, 45, 1.75, 1.24)).toMatchObject({
      remaining: 150,
      usable: 130,
      surplus: 85,
      copies: 2,
    });
    expect(spoolSufficiency(230, 200, 20, 45, 1.75, 1.24)?.surplus).toBe(-35);
    expect(spoolSufficiency(200, 200, 20, 45, 1.75, 1.24)).toMatchObject({
      metres: 0,
      copies: 0,
    });
  });
  it('rejects inconsistent weights, nonfinite inputs and zero job usage', () => {
    expect(spoolSufficiency(100, 200, 0, 1, 1.75, 1.24)).toBeNull();
    expect(spoolSufficiency(300, 200, 0, 0, 1.75, 1.24)).toBeNull();
    expect(spoolSufficiency(Infinity, 200, 0, 1, 1.75, 1.24)).toBeNull();
  });
});
describe('wall and throughput planning', () => {
  it('separates nozzle diameter, line width and layer height', () => {
    expect(wallPlan(0.4, 0.45, 1.3, 0.2)).toMatchObject({
      lines: 3,
      nominalThickness: 1.35,
      layerRatio: 0.5,
    });
    expect(volumetricPlan(0.45, 0.2, 100, 8)?.flow).toBeCloseTo(9);
    expect(volumetricPlan(0.45, 0.2, 100, 8)).toMatchObject({
      exceeds: true,
    });
    expect(volumetricPlan(0.45, 0.2, 100, null)?.speedAtLimit).toBeNull();
    expect(volumetricPlan(0, 0.2, 100, 8)).toBeNull();
    expect(wallPlan(0.4, NaN, 1, 0.2)).toBeNull();
  });
});
describe('finish planning across timezone boundaries', () => {
  it('adds elapsed duration across London spring DST and midnight', () => {
    const start = zonedStart('2026-03-29T00:30', 'Europe/London');
    expect(start).toBe(Date.parse('2026-03-29T00:30:00Z'));
    expect(finishTime(start!, 2, 0, 0, 1)?.finish).toBe(
      Date.parse('2026-03-29T02:30:00Z'),
    );
    expect(zonedStart('2026-03-29T01:30', 'Europe/London')).toBeNull();
    expect(
      finishTime(Date.parse('2026-10-04T23:30Z'), 48, 45, 15, 1)?.finish,
    ).toBe(Date.parse('2026-10-07T00:30Z'));
  });
  it('handles both occurrences of a repeated hour and other regions', () => {
    const first = zonedStart('2026-10-25T01:30', 'Europe/London');
    const second = zonedStart(
      '2026-10-25T01:30',
      'Europe/London',
      TimeOccurrence.Later,
    );
    expect(second! - first!).toBe(3600000);
    expect(zonedStart('2026-10-04T12:00', 'Australia/Sydney')).toBe(
      Date.parse('2026-10-04T01:00Z'),
    );
    expect(zonedStart('2026-02-30T12:00', 'UTC')).toBeNull();
    expect(finishTime(first!, 1, 60, 0, 1)).toBeNull();
  });
});
