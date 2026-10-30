/** Claim metadata stays with the existing material records and source registry. */
export const EvidenceScope = {
  Family: 'family-guidance',
  Grade: 'named-grade',
} as const;
export type EvidenceScope = (typeof EvidenceScope)[keyof typeof EvidenceScope];
export const MaterialProperty = {
  Density: 'Density',
  Nozzle: 'Recommended nozzle temperature',
  Hdt: 'Heat deflection temperature',
  Modulus: 'Tensile modulus',
  HardnessA: 'Shore A hardness',
  HardnessD: 'Shore D hardness',
  Uv: 'UV exposure statement',
  Enclosure: 'Enclosure instruction',
  NozzleWear: 'Nozzle wear requirement',
  Surface: 'Build surface instruction',
  Drying: 'Drying instruction',
  Speed: 'Print speed guidance',
} as const;
export type MaterialProperty =
  (typeof MaterialProperty)[keyof typeof MaterialProperty];
export const EvidenceAvailability = {
  Published: 'published',
  NotSpecified: 'not specified',
  NotFound: 'not found in this document',
  NotApplicable: 'not applicable',
} as const;
export type EvidenceAvailability =
  (typeof EvidenceAvailability)[keyof typeof EvidenceAvailability];
export type MaterialEvidenceClaim = Readonly<{
  id: string;
  scope: EvidenceScope;
  property: MaterialProperty;
  availability: EvidenceAvailability;
  value?: number;
  range?: Readonly<{ min: number; max: number }>;
  uncertainty?: number;
  unit?: string;
  statement?: string;
  sourceId: string;
  sourceLocation: string;
  method?: string;
  testLoad?: string;
  specimen?: string;
  orientation?: string;
  conditioning?: string;
  testTemperature?: string;
  limitations: readonly string[];
}>;
export type ProductEvidence = Readonly<{
  manufacturer: string;
  productName: string;
  formulation: string;
  heading: string;
  interpretation: string;
  nextCheck: string;
  revisionNote?: string;
  claims: readonly MaterialEvidenceClaim[];
  checklist?: readonly string[];
  enclosureRequired?: boolean;
  hardenedNozzleRequired?: boolean;
}>;
export type EvidenceSource = Readonly<{
  id: string;
  url: string;
  accessedAt: string;
  documentVersion?: string;
  documentDate?: string;
}>;
export const ComparisonOutcome = {
  Comparable: 'Directly comparable reported results',
  Separate: 'Separate published values',
  Unavailable: 'Unavailable',
} as const;
export type ComparisonOutcome =
  (typeof ComparisonOutcome)[keyof typeof ComparisonOutcome];

const PhysicalQuantity = {
  Density: 'density',
  Stress: 'stress',
  Temperature: 'temperature',
  HardnessA: 'hardness-A',
  HardnessD: 'hardness-D',
  Speed: 'speed',
} as const;
type PhysicalQuantity =
  (typeof PhysicalQuantity)[keyof typeof PhysicalQuantity];
const unitDefinitions: Readonly<
  Record<string, Readonly<{ quantity: PhysicalQuantity; factor: number }>>
> = {
  'g/cm³': { quantity: PhysicalQuantity.Density, factor: 1 },
  'kg/m³': { quantity: PhysicalQuantity.Density, factor: 0.001 },
  GPa: { quantity: PhysicalQuantity.Stress, factor: 1000 },
  MPa: { quantity: PhysicalQuantity.Stress, factor: 1 },
  '°C': { quantity: PhysicalQuantity.Temperature, factor: 1 },
  'Shore A': { quantity: PhysicalQuantity.HardnessA, factor: 1 },
  'Shore D': { quantity: PhysicalQuantity.HardnessD, factor: 1 },
  'mm/s': { quantity: PhysicalQuantity.Speed, factor: 1 },
};
export function normalizeEvidenceValue(
  value: number,
  from: string,
  to: string,
): number | null {
  const source = unitDefinitions[from];
  const target = unitDefinitions[to];
  if (
    !Number.isFinite(value) ||
    !source ||
    !target ||
    source.quantity !== target.quantity
  ) {
    return null;
  }
  return (value * source.factor) / target.factor;
}
export function compareClaims(
  left?: MaterialEvidenceClaim,
  right?: MaterialEvidenceClaim,
): Readonly<{ outcome: ComparisonOutcome; reason: string }> {
  if (
    !left ||
    !right ||
    left.availability !== EvidenceAvailability.Published ||
    right.availability !== EvidenceAvailability.Published
  ) {
    return {
      outcome: ComparisonOutcome.Unavailable,
      reason:
        'A numeric result is not published for one or both selected examples. Missing is not zero.',
    };
  }
  if (left.value === undefined || right.value === undefined) {
    return {
      outcome: ComparisonOutcome.Separate,
      reason:
        'Published ranges or instructions are shown separately. No single-value numerical comparison is asserted.',
    };
  }
  if (
    left.property !== right.property ||
    !left.unit ||
    !right.unit ||
    normalizeEvidenceValue(right.value, right.unit, left.unit) === null
  ) {
    return {
      outcome: ComparisonOutcome.Separate,
      reason:
        'Different physical properties or units cannot establish a numerical winner.',
    };
  }
  const keys =
    left.property === MaterialProperty.Hdt
      ? ([
          'method',
          'testLoad',
          'specimen',
          'orientation',
          'conditioning',
          'testTemperature',
        ] as const)
      : left.property === MaterialProperty.Density
        ? (['method', 'specimen', 'conditioning', 'testTemperature'] as const)
        : ([
            'method',
            'specimen',
            'orientation',
            'conditioning',
            'testTemperature',
          ] as const);
  const mismatches = keys.filter(
    (key) => !left[key] || !right[key] || left[key] !== right[key],
  );
  if (mismatches.length) {
    return {
      outcome: ComparisonOutcome.Separate,
      reason: `Different or unspecified ${mismatches.map((key) => (key === 'testLoad' ? 'test load' : key === 'testTemperature' ? 'test temperature' : key)).join(', ')}. Read each source separately; these values do not establish which material performs better in your part.`,
    };
  }
  return {
    outcome: ComparisonOutcome.Comparable,
    reason:
      'Property, units, method, specimen, orientation where relevant, conditioning, temperature and load where relevant match. This compares reported tests, not your part.',
  };
}
export function claimValue(claim: MaterialEvidenceClaim): string {
  if (claim.availability !== EvidenceAvailability.Published) {
    return claim.availability;
  }
  if (claim.value !== undefined) {
    return `${claim.value}${claim.uncertainty === undefined ? '' : ` ± ${claim.uncertainty}`} ${claim.unit ?? ''}`.trim();
  }
  if (claim.range) {
    return `${claim.range.min} to ${claim.range.max} ${claim.unit ?? ''}`.trim();
  }
  return claim.statement ?? 'Not specified';
}
export function claimContext(claim: MaterialEvidenceClaim): string {
  return `Method: ${claim.method ?? 'not specified'}; load: ${claim.testLoad ?? 'not specified'}; specimen: ${claim.specimen ?? 'not specified'}; orientation: ${claim.orientation ?? 'not specified'}; conditioning: ${claim.conditioning ?? 'not specified'}; test temperature: ${claim.testTemperature ?? 'not specified'}.`;
}
export function productClaimLabel(
  example: ProductEvidence,
  claim: MaterialEvidenceClaim,
): string {
  if (
    claim.scope === EvidenceScope.Grade &&
    (!example.productName.trim() ||
      !example.manufacturer.trim() ||
      !example.formulation.trim())
  ) {
    throw new Error(
      `Named-grade claim ${claim.id} requires manufacturer, product and formulation identity.`,
    );
  }
  return `${example.manufacturer} ${example.productName}: ${claimValue(claim)}`;
}
export const MATERIAL_EVIDENCE_FRAGMENT = 'product-evidence';
export function validateMaterialEvidence(
  records: readonly Readonly<{
    id: string;
    productExample?: ProductEvidence;
  }>[],
  sources: readonly EvidenceSource[],
  asOf: string,
): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const dateValid = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  for (const source of sources) {
    if (!dateValid(source.accessedAt) || source.accessedAt > asOf) {
      errors.push(
        `${source.id}: invalid/future access date ${source.accessedAt}`,
      );
    }
    if (
      source.documentDate &&
      (!dateValid(source.documentDate) ||
        source.documentDate > source.accessedAt)
    ) {
      errors.push(
        `${source.id}: invalid/future document date ${source.documentDate}`,
      );
    }
  }
  for (const record of records) {
    const example = record.productExample;
    if (!example) {
      continue;
    }
    if (
      example.enclosureRequired &&
      !example.claims.some(
        (claim) =>
          claim.property === MaterialProperty.Enclosure &&
          claim.availability === EvidenceAvailability.Published,
      )
    ) {
      errors.push(
        `${record.id}: an enclosure constraint needs a published product instruction`,
      );
    }
    if (
      example.hardenedNozzleRequired &&
      !example.claims.some(
        (claim) =>
          claim.property === MaterialProperty.NozzleWear &&
          claim.availability === EvidenceAvailability.Published,
      )
    ) {
      errors.push(
        `${record.id}: a nozzle constraint needs a published product instruction`,
      );
    }
    for (const claim of example.claims) {
      const prefix = `${record.id}/${claim.id}`;
      if (
        claim.scope === EvidenceScope.Family &&
        (claim.value !== undefined || claim.range)
      ) {
        errors.push(
          `${prefix}: family guidance cannot inherit a named product numeric value`,
        );
      }
      if (!claim.id || ids.has(claim.id)) {
        errors.push(`${prefix}: missing/duplicate claim ID`);
      }
      ids.add(claim.id);
      try {
        productClaimLabel(example, claim);
      } catch (error) {
        errors.push(`${prefix}: ${String(error)}`);
      }
      if (!sources.some((source) => source.id === claim.sourceId)) {
        errors.push(`${prefix}: missing source ID ${claim.sourceId}`);
      }
      if (!claim.sourceLocation.trim()) {
        errors.push(`${prefix}: missing source location`);
      }
      if (claim.unit && !unitDefinitions[claim.unit]) {
        errors.push(`${prefix}: unsupported unit ${claim.unit}`);
      }
      if (
        claim.range &&
        (!Number.isFinite(claim.range.min) ||
          !Number.isFinite(claim.range.max) ||
          claim.range.min > claim.range.max)
      ) {
        errors.push(`${prefix}: invalid range`);
      }
      if (claim.value !== undefined && !Number.isFinite(claim.value)) {
        errors.push(`${prefix}: nonfinite value`);
      }
      const quantity = claim.unit
        ? unitDefinitions[claim.unit]?.quantity
        : undefined;
      const expectedQuantity =
        claim.property === MaterialProperty.Density
          ? PhysicalQuantity.Density
          : claim.property === MaterialProperty.Hdt ||
              claim.property === MaterialProperty.Nozzle
            ? PhysicalQuantity.Temperature
            : claim.property === MaterialProperty.Modulus
              ? PhysicalQuantity.Stress
              : claim.property === MaterialProperty.HardnessA
                ? PhysicalQuantity.HardnessA
                : claim.property === MaterialProperty.HardnessD
                  ? PhysicalQuantity.HardnessD
                  : claim.property === MaterialProperty.Speed
                    ? PhysicalQuantity.Speed
                    : undefined;
      if (
        (claim.value !== undefined || claim.range) &&
        (!expectedQuantity || quantity !== expectedQuantity)
      ) {
        errors.push(`${prefix}: unit does not describe ${claim.property}`);
      }
      const payloads = [
        claim.value !== undefined,
        !!claim.range,
        !!claim.statement?.trim(),
      ].filter(Boolean).length;
      if (
        claim.availability === EvidenceAvailability.Published
          ? payloads !== 1
          : payloads !== 0
      ) {
        errors.push(
          `${prefix}: published claim needs exactly one value, range or statement; unavailable claims must not contain values`,
        );
      }
      if (
        claim.uncertainty !== undefined &&
        (!Number.isFinite(claim.uncertainty) ||
          claim.uncertainty < 0 ||
          claim.value === undefined)
      ) {
        errors.push(`${prefix}: invalid uncertainty`);
      }
    }
  }
  return errors;
}
