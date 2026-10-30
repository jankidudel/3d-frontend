import { materials } from '../materials/material-catalogue';
import { MaterialProperty } from '../materials/material-evidence';

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

export const FilamentPreset = Object.fromEntries(
  Object.keys(FILAMENT_PRESETS).map((key) => [key, key]),
) as { readonly [Key in keyof typeof FILAMENT_PRESETS]: Key };
export type FilamentPreset =
  (typeof FilamentPreset)[keyof typeof FilamentPreset];

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

export const DensityOrigin = {
  Family: 'Family preset (approximate, editable)',
  Product: 'Published product density',
  User: 'User-entered density',
} as const;
export type DensityOrigin = (typeof DensityOrigin)[keyof typeof DensityOrigin];
export type DensityState = Readonly<{
  preset: FilamentPreset;
  value: number;
  origin: DensityOrigin;
  productId?: string;
  notice?: string;
}>;
export function resolveDensityPreset(
  id: string | null,
): FilamentPreset | undefined {
  if (id === null) {
    return FilamentPreset.Pla;
  }
  const keys = Object.keys(FILAMENT_PRESETS) as FilamentPreset[];
  const family = materials.find(
    (material) => material.id === id || material.slug === id,
  );
  return keys.find(
    (key) =>
      key === id ||
      key.toLowerCase() === id ||
      family?.displayName === FILAMENT_PRESETS[key].label,
  );
}
export function initialDensityState(
  materialId: string | null,
  gradeId: string | null,
): DensityState {
  const preset = resolveDensityPreset(materialId);
  if (gradeId !== null) {
    const product = materials.find((material) => material.id === gradeId);
    const claim = product?.productExample?.claims.find(
      (claim) =>
        claim.property === MaterialProperty.Density &&
        claim.value !== undefined,
    );
    if (product && claim?.value !== undefined) {
      return {
        preset: resolveDensityPreset(product.id) ?? FilamentPreset.Custom,
        value: claim.value,
        origin: DensityOrigin.Product,
        productId: product.id,
      };
    }
    return {
      preset: FilamentPreset.Custom,
      value: 1.24,
      origin: DensityOrigin.User,
      notice:
        'Unknown product-density reference. The displayed 1.24 g/cm³ is an illustrative editable input; no product value was applied.',
    };
  }
  if (!preset) {
    return {
      preset: FilamentPreset.Custom,
      value: 1.24,
      origin: DensityOrigin.User,
      notice:
        'Unknown material preset. The displayed 1.24 g/cm³ is an illustrative editable input; no other material was silently selected.',
    };
  }
  return {
    preset,
    value: FILAMENT_PRESETS[preset].density,
    origin:
      preset === FilamentPreset.Custom
        ? DensityOrigin.User
        : DensityOrigin.Family,
  };
}
export function editDensity(state: DensityState, value: number): DensityState {
  return { preset: state.preset, value, origin: DensityOrigin.User };
}
export function selectDensityPreset(
  state: DensityState,
  id: string,
): DensityState {
  const preset = resolveDensityPreset(id);
  if (!preset) {
    return {
      ...state,
      notice: 'Unknown preset; your current density has been preserved.',
    };
  }
  if (state.origin === DensityOrigin.User || preset === FilamentPreset.Custom) {
    return {
      preset,
      value: state.value,
      origin: DensityOrigin.User,
      notice:
        'Your entered density was preserved. Apply the selected family preset explicitly if you want to replace it.',
    };
  }
  return initialDensityState(preset, null);
}
