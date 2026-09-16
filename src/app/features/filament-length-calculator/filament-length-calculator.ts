export const FILAMENT_PRESETS = {
  Pla: { label: 'PLA', density: 1.24 },
  Petg: { label: 'PETG', density: 1.27 },
  Abs: { label: 'ABS', density: 1.04 },
  Tpu: { label: 'TPU', density: 1.21 },
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
