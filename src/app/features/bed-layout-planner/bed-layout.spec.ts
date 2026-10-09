import { describe, expect, it } from 'vitest';
import { planBedLayout } from './bed-layout';
describe('bed layout example', () => {
  it('reserves the stated edge and inter-part spacing for two footprints', () => {
    const result = planBedLayout(
      [
        { name: 'A', width: 100, depth: 80 },
        { name: 'B', width: 100, depth: 80 },
      ],
      220,
      220,
      5,
    );
    expect(result.remaining).toHaveLength(0);
    expect(result.placed.map(({ x, y }) => [x, y])).toEqual([
      [5, 5],
      [110, 5],
    ]);
  });
  it('keeps an oversized footprint distinct from an empty plan', () => {
    expect(planBedLayout([], 220, 220, 5).placed).toHaveLength(0);
    expect(
      planBedLayout([{ name: 'large', width: 230, depth: 230 }], 220, 220, 5)
        .remaining,
    ).toHaveLength(1);
  });
});
