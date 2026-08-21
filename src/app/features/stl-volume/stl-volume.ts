import { convertLength, ModelUnit } from '../stl-dimensions/stl-dimensions';

export type Material = 'pla' | 'petg' | 'abs' | 'tpu' | 'resin' | 'custom';

export interface MaterialOption {
  label: string;
  density: number | null;
}

export interface MaterialEstimate {
  solidMassGrams: number;
  infillMassGrams: number;
}

export const MATERIAL_OPTIONS: Record<Material, MaterialOption> = {
  pla: { label: 'PLA', density: 1.24 },
  petg: { label: 'PETG', density: 1.27 },
  abs: { label: 'ABS', density: 1.04 },
  tpu: { label: 'TPU', density: 1.21 },
  resin: { label: 'Resin', density: 1.1 },
  custom: { label: 'Custom density', density: null },
};

export function convertVolume(
  value: number,
  from: ModelUnit,
  to: ModelUnit,
): number {
  const linearFactor = convertLength(1, from, to);
  return value * linearFactor ** 3;
}

export function calculateMaterialEstimate(
  volumeCubicCentimetres: number,
  densityGramsPerCubicCentimetre: number,
  infillPercentage: number,
): MaterialEstimate | null {
  if (
    !Number.isFinite(volumeCubicCentimetres) ||
    volumeCubicCentimetres < 0 ||
    !Number.isFinite(densityGramsPerCubicCentimetre) ||
    densityGramsPerCubicCentimetre <= 0 ||
    !Number.isFinite(infillPercentage) ||
    infillPercentage < 0 ||
    infillPercentage > 100
  ) {
    return null;
  }

  const solidMassGrams =
    volumeCubicCentimetres * densityGramsPerCubicCentimetre;
  const infillMassGrams = solidMassGrams * (infillPercentage / 100);
  return Number.isFinite(solidMassGrams) && Number.isFinite(infillMassGrams)
    ? { solidMassGrams, infillMassGrams }
    : null;
}
