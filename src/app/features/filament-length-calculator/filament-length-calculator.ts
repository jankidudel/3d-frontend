import { materials } from '../materials/material-catalogue';

export const FILAMENT_PRESETS = {
  Pla: { label: 'PLA', density: materials[0].density },
  Petg: { label: 'PETG', density: materials[1].density },
  Abs: { label: 'ABS', density: materials[2].density },
  Asa: { label: 'ASA', density: materials[3].density },
  Tpu: { label: 'TPU', density: materials[4].density },
  Nylon: { label: 'PA / Nylon', density: materials[5].density },
  Pc: { label: 'Polycarbonate / PC', density: materials[6].density },
  Pp: { label: 'Polypropylene / PP', density: materials[7].density },
  Custom: { label: 'Custom density', density: 1.24 },
} as const;

export type FilamentPreset = keyof typeof FILAMENT_PRESETS;

export const FILAMENT_DIAMETERS = [1.75, 2.85] as const;

export function gramsToMetres(
  weightGrams: number,
  diameterMillimetres: number,
  densityGramsPerCm3: number,
): number | null {
  if (
    !isPositiveFinite(weightGrams) ||
    !isPositiveFinite(diameterMillimetres) ||
    !isPositiveFinite(densityGramsPerCm3)
  ) {
    return null;
  }

  const radiusCentimetres = diameterMillimetres / 20;
  const crossSectionCm2 = Math.PI * radiusCentimetres ** 2;
  return weightGrams / densityGramsPerCm3 / crossSectionCm2 / 100;
}

export function metresToGrams(
  lengthMetres: number,
  diameterMillimetres: number,
  densityGramsPerCm3: number,
): number | null {
  if (
    !isPositiveFinite(lengthMetres) ||
    !isPositiveFinite(diameterMillimetres) ||
    !isPositiveFinite(densityGramsPerCm3)
  ) {
    return null;
  }

  const radiusCentimetres = diameterMillimetres / 20;
  const crossSectionCm2 = Math.PI * radiusCentimetres ** 2;
  return lengthMetres * 100 * crossSectionCm2 * densityGramsPerCm3;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
