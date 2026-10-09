import { describe, it, expect } from 'vitest';
import { scoreMaterial, UseCase } from './material-tools';
import { materials, MaterialId } from './material-catalogue';
describe('material selector requirement scenarios', () => {
  it('separates flexible bumper candidates from rigid families', () => {
    const tpu = materials.find((material) => material.id === MaterialId.Tpu)!;
    const pla = materials.find((material) => material.id === MaterialId.Pla)!;
    expect(scoreMaterial(tpu, UseCase.Flexible, false).blockers).toHaveLength(
      0,
    );
    expect(scoreMaterial(pla, UseCase.Flexible, false).blockers).toHaveLength(
      1,
    );
    expect(scoreMaterial(tpu, UseCase.Flexible, false).total).toBeGreaterThan(
      scoreMaterial(pla, UseCase.Flexible, false).total,
    );
  });
  it('keeps an enclosure blocker visible despite ASA outdoor priority', () => {
    const asa = materials.find((material) => material.id === MaterialId.Asa)!;
    expect(scoreMaterial(asa, UseCase.Outdoor, false).blockers).toHaveLength(1);
    expect(scoreMaterial(asa, UseCase.Outdoor, true).blockers).toHaveLength(0);
  });
});
