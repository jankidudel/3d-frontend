import {
  BedShape,
  isPrinterProfile,
  PrinterProfile,
  printerProfileMm,
} from './printer-profile.service';
import {
  calculateRightAngleRotationFits,
  ModelDimensions,
  ModelUnit,
  convertLength,
  PrinterOrientationAssessment,
  RotationFitResult,
} from '../../shared/model-dimensions';
export const EnvelopeState = {
  Contained: 'Envelope contained',
  Outside: 'Envelope not contained',
  Unavailable: 'Unavailable',
  NotAssessed: 'Not assessed',
} as const;
export type EnvelopeState = (typeof EnvelopeState)[keyof typeof EnvelopeState];
const MAX_SCALE_ROUNDING_CORRECTIONS = 4;
export interface EnvelopeAssessment {
  readonly state: EnvelopeState;
  readonly shape: BedShape | null;
  readonly unit: 'mm';
  readonly axes: 'X/Y/Z';
  readonly position: 'centred planning envelope';
  readonly edgeExclusionMm: number;
  readonly expansionMm: number;
  readonly radiusSlackMm: number | null;
  readonly zSlackMm: number | null;
  readonly maximumScalePercentage: number | null;
}
/** Strict stored-number <= boundary; no hidden physical or epsilon allowance. */
export function rectangleInDisc(
  x: number,
  y: number,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): boolean {
  return (
    [x, y, width, height, cx, cy, radius].every(Number.isFinite) &&
    width > 0 &&
    height > 0 &&
    radius > 0 &&
    [
      [x, y],
      [x + width, y],
      [x, y + height],
      [x + width, y + height],
    ].every(([px, py]) => Math.hypot(px - cx, py - cy) <= radius)
  );
}
export function assessEnvelope(
  model: ModelDimensions,
  modelUnit: ModelUnit,
  profile: PrinterProfile | null,
  edge = 0,
  expansion = 0,
): EnvelopeAssessment {
  const base = {
    shape: profile?.shape ?? null,
    unit: 'mm',
    axes: 'X/Y/Z',
    position: 'centred planning envelope',
    edgeExclusionMm: edge,
    expansionMm: expansion,
    radiusSlackMm: null,
    zSlackMm: null,
    maximumScalePercentage: null,
  } as const;
  if (
    !profile ||
    !isPrinterProfile(profile) ||
    ![edge, expansion].every((v) => Number.isFinite(v) && v >= 0)
  ) {
    return { ...base, state: EnvelopeState.Unavailable };
  }
  const p = printerProfileMm(profile);
  const w = convertLength(model.width, modelUnit, 'mm'),
    h = convertLength(model.height, modelUnit, 'mm'),
    z = convertLength(model.depth, modelUnit, 'mm');
  const x = p.x - 2 * edge,
    y = p.y - 2 * edge;
  if (![w, h, z, x, y, p.z].every((v) => Number.isFinite(v) && v > 0)) {
    return { ...base, state: EnvelopeState.Unavailable };
  }
  let planarFits: boolean,
    scale: number,
    radiusSlackMm: number | null = null;
  if (p.shape === BedShape.Circular) {
    const r = p.diameter! / 2 - edge;
    const corner = Math.hypot(w / 2 + expansion, h / 2 + expansion);
    radiusSlackMm = r - corner;
    planarFits = corner <= r;
    // Fixed physical expansion: solve A*s²+B*s+C <= 0, never scale the allowance.
    const a = w * w + h * h,
      b = 4 * expansion * (w + h),
      c = 8 * expansion * expansion - 4 * r * r;
    scale = c >= 0 ? 0 : (-2 * c) / (b + Math.sqrt(b * b - 4 * a * c));
  } else {
    planarFits = w + 2 * expansion <= x && h + 2 * expansion <= y;
    scale = Math.max(
      0,
      Math.min((x - 2 * expansion) / w, (y - 2 * expansion) / h),
    );
  }
  scale = Math.min(scale, p.z / z);
  if (!Number.isFinite(scale)) {
    return { ...base, state: EnvelopeState.Unavailable };
  }
  // A derived scale must pass the same strict boundary after floating-point multiplication.
  const scaleIsContained = () =>
    scale * z <= p.z &&
    (p.shape === BedShape.Circular
      ? Math.hypot((scale * w) / 2 + expansion, (scale * h) / 2 + expansion) <=
        p.diameter! / 2 - edge
      : scale * w + 2 * expansion <= x && scale * h + 2 * expansion <= y);
  for (
    let correction = 0;
    scale > 0 &&
    !scaleIsContained() &&
    correction < MAX_SCALE_ROUNDING_CORRECTIONS;
    correction++
  ) {
    scale *= 1 - Number.EPSILON;
  }
  if (scale > 0 && !scaleIsContained()) {
    return { ...base, state: EnvelopeState.Unavailable };
  }
  return {
    ...base,
    state:
      planarFits && z <= p.z ? EnvelopeState.Contained : EnvelopeState.Outside,
    radiusSlackMm,
    zSlackMm: p.z - z,
    maximumScalePercentage: scale * 100,
  };
}
export function assessProfileOrientations(
  model: ModelDimensions,
  unit: ModelUnit,
  profile: PrinterProfile | null,
  edge = 0,
  expansion = 0,
): PrinterOrientationAssessment | null {
  if (!profile || !isPrinterProfile(profile)) {
    return null;
  }
  const p = printerProfileMm(profile);
  const orientations: RotationFitResult[] = calculateRightAngleRotationFits(
    model,
    unit,
    { width: p.x, height: p.y, depth: p.z },
    'mm',
  ).flatMap((candidate) => {
    const e = assessEnvelope(candidate.dimensions, 'mm', p, edge, expansion);
    if (
      e.state === EnvelopeState.Unavailable ||
      e.maximumScalePercentage === null
    ) {
      return [];
    }
    const factor = e.maximumScalePercentage / 100;
    return [
      {
        ...candidate,
        fit: {
          ...candidate.fit,
          fits: e.state === EnvelopeState.Contained,
          maximumScaleFactor: factor,
          maximumScalePercentage: e.maximumScalePercentage,
          scaledDimensions: {
            width: candidate.dimensions.width * factor,
            height: candidate.dimensions.height * factor,
            depth: candidate.dimensions.depth * factor,
          },
        },
        clearance: {
          width: p.x - 2 * edge - candidate.dimensions.width - 2 * expansion,
          height: p.y - 2 * edge - candidate.dimensions.height - 2 * expansion,
          depth: p.z - candidate.dimensions.depth,
        },
        minimumClearance:
          e.radiusSlackMm === null
            ? Math.min(
                p.x - 2 * edge - candidate.dimensions.width - 2 * expansion,
                p.y - 2 * edge - candidate.dimensions.height - 2 * expansion,
                p.z - candidate.dimensions.depth,
              )
            : Math.min(e.radiusSlackMm, e.zSlackMm!),
      },
    ];
  });
  const current = orientations[0];
  if (!current) {
    return null;
  }
  const fitting = orientations.filter((c) => c.fit.fits);
  return {
    orientations,
    current,
    recommended: fitting.length
      ? fitting.reduce((a, b) =>
          b.minimumClearance > a.minimumClearance ? b : a,
        )
      : null,
    nearest: fitting.length
      ? null
      : orientations.reduce((a, b) =>
          b.fit.maximumScalePercentage > a.fit.maximumScalePercentage ? b : a,
        ),
  };
}
