import { Matrix4, Vector3 } from 'three';
import { PlacementMatrix } from './placement-matrix';

/** Deterministic pseudo-random values so failures are reproducible. */
function sequence(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return (state / 2_147_483_648 - 0.5) * 200;
  };
}

/** A 3MF transform: 12 values, row-major 3x4, as the resolver reads them. */
function transformValues(next: () => number): number[] {
  return Array.from({ length: 12 }, () => next());
}

function fromThreeMf(values: readonly number[]) {
  const order = [0, 3, 6, 9, 1, 4, 7, 10, 2, 5, 8, 11] as const;
  const elements = [...order.map((index) => values[index]), 0, 0, 0, 1] as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  return {
    placement: new PlacementMatrix().set(...elements),
    three: new Matrix4().set(...elements),
  };
}

describe('PlacementMatrix', () => {
  it('matches three.js bit for bit for composed 3MF placements', () => {
    const next = sequence(42);
    for (let run = 0; run < 200; run++) {
      const outer = fromThreeMf(transformValues(next));
      const inner = fromThreeMf(transformValues(next));
      const placement = outer.placement.clone().multiply(inner.placement);
      const three = outer.three.clone().multiply(inner.three);

      expect(placement.toArray()).toEqual(three.toArray());
      expect(placement.determinant()).toBe(three.determinant());

      const point = [next(), next(), next()] as const;
      const scale = 25.4;
      const expected = new Vector3(...point)
        .applyMatrix4(three)
        .multiplyScalar(scale);
      const actual = placement
        .applyToPoint(...point)
        .map((value) => value * scale);
      expect(actual).toEqual([expected.x, expected.y, expected.z]);
    }
  });

  it('starts as the identity, like a 3MF item without a transform', () => {
    expect(new PlacementMatrix().toArray()).toEqual(new Matrix4().toArray());
    expect(new PlacementMatrix().applyToPoint(1.5, -2, 3)).toEqual([
      1.5, -2, 3,
    ]);
  });

  it('clones independently of the original', () => {
    const original = new PlacementMatrix();
    const copy = original
      .clone()
      .multiply(
        new PlacementMatrix().set(
          2,
          0,
          0,
          1,
          0,
          2,
          0,
          1,
          0,
          0,
          2,
          1,
          0,
          0,
          0,
          1,
        ),
      );
    expect(original.toArray()).toEqual(new Matrix4().toArray());
    expect(copy.toArray()).not.toEqual(original.toArray());
  });
});
