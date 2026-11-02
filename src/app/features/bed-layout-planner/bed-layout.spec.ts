import { BedShape } from '../../core/printer/printer-profile.service';
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

describe('shape-aware layout validity', () => {
  it('tries a long narrow part centred on a circle', () => {
    const plan = planBedLayout(
      [{ name: 'long', width: 180, depth: 20 }],
      220,
      220,
      0,
      { shape: BedShape.Circular, gap: 5 },
    );
    expect(plan.placed).toHaveLength(1);
    expect(plan.placed[0].x).toBe(20);
    expect(plan.placed[0].y).toBe(100);
  });
  it('independently verifies all accepted circular corners and reserved gaps', () => {
    const plan = planBedLayout(
      Array.from({ length: 20 }, (_, i) => ({
        name: String(i),
        width: 30,
        depth: 25,
      })),
      220,
      220,
      5,
      { shape: BedShape.Circular, gap: 7, expansion: 4 },
    );
    expect(plan.placed.length).toBeGreaterThan(1);
    for (const p of plan.placed) {
      for (const x of [p.x, p.x + p.width]) {
        for (const y of [p.y, p.y + p.depth]) {
          expect((x - 110) ** 2 + (y - 110) ** 2).toBeLessThanOrEqual(105 ** 2);
        }
      }
      for (const q of plan.placed) {
        if (p === q) {
          continue;
        }
        const dx = Math.max(q.x - (p.x + p.width), p.x - (q.x + q.width));
        const dy = Math.max(q.y - (p.y + p.depth), p.y - (q.y + q.depth));
        expect(Math.max(dx, dy)).toBeGreaterThanOrEqual(7);
      }
    }
  });
  it('reserves expansion first then leaves the selected gap', () => {
    const plan = planBedLayout(
      [
        { name: 'A', width: 100, depth: 80 },
        { name: 'B', width: 100, depth: 80 },
      ],
      240,
      100,
      5,
      { gap: 5, expansion: 4 },
    );
    expect(plan.placed).toHaveLength(2);
    const [a, b] = plan.placed;
    const bodyGap = b.x + 4 - (a.x + 4 + a.modelWidth);
    expect(bodyGap).toBe(13);
    expect(5 - 4 - 4).toBe(-3);
    expect(
      planBedLayout([{ name: 'wide', width: 200, depth: 200 }], 220, 220, 5, {
        expansion: 6,
      }).placed,
    ).toHaveLength(0);
  });
});
