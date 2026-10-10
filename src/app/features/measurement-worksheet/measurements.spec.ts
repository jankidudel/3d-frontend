import { describe, expect, it } from 'vitest';
import {
  buildWorksheet,
  emptyReading,
  emptyWorksheetNotes,
  summarizeReadings,
  worksheetText,
} from './measurements';

describe('comparable measurement records', () => {
  const readings = [9.68, 9.72, 9.7].map((value) => ({
    value,
    included: true,
    reason: '',
  }));
  it('retains full-precision mean and recorded spread, including a single reading', () => {
    const result = summarizeReadings(readings);
    expect(result?.mean).toBeCloseTo(9.7, 12);
    expect(result?.range).toBeCloseTo(0.04, 12);
    expect(result?.minimum).toBe(9.68);
    expect(result?.maximum).toBe(9.72);
    expect(result?.count).toBe(3);
    expect(summarizeReadings(readings.slice(0, 1))?.range).toBe(0);
  });
  it('requires every deliberate reading and exclusion reason without silently dropping invalid input', () => {
    for (const value of [null, 0, -1, NaN, Infinity]) {
      expect(
        summarizeReadings([...readings, { value, included: true, reason: '' }]),
      ).toBeNull();
    }
    expect(summarizeReadings([emptyReading()])).toBeNull();
    expect(summarizeReadings([])).toBeNull();
    expect(summarizeReadings([{ ...readings[0], included: false }])).toBeNull();
    const excluded = {
      value: 12,
      included: false,
      reason: 'Wrong measuring direction; retained separately',
    };
    expect(summarizeReadings([...readings, excluded])?.mean).toBeCloseTo(9.7);
    expect(summarizeReadings([excluded])).toBeNull();
  });
  it('exports raw exclusions, notes and full precision from the same source used by the text worksheet', () => {
    const notes = {
      ...emptyWorksheetNotes(),
      label: '<script>text only</script>',
      method: 'Gauge',
      outcome: 'Not accepted yet',
    };
    const calculation = {
      readings: [
        ...readings,
        { value: 10.01, included: false, reason: 'Unconditioned' },
      ],
      statistics: summarizeReadings(readings),
      scale: 100 / 99.2,
    };
    const record = buildWorksheet(calculation, notes);
    expect(JSON.parse(JSON.stringify(record))).toEqual(record);
    expect(worksheetText(record)).toContain('Unconditioned');
    expect(worksheetText(record)).toContain('1.008065');
    expect(worksheetText(record)).toContain(notes.label);
    expect(record.schema).toBe('inspectmesh-measurement-1');
  });
});
