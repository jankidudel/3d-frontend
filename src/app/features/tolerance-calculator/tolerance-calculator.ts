export const FitIntent = {
  Clearance: 'clearance',
  Sliding: 'sliding',
  Snug: 'snug',
  Interference: 'interference',
  Custom: 'custom',
} as const;

export type FitIntent = (typeof FitIntent)[keyof typeof FitIntent];

export interface FitPreset {
  readonly clearance: number;
  readonly intent: FitIntent;
  readonly label: string;
}

export const FIT_PRESETS: readonly FitPreset[] = [
  {
    intent: FitIntent.Sliding,
    label: 'Close/sliding starting point',
    clearance: 0.2,
  },
  {
    intent: FitIntent.Clearance,
    label: 'General assembly starting point',
    clearance: 0.3,
  },
  {
    intent: FitIntent.Clearance,
    label: 'Loose-moving starting point',
    clearance: 0.5,
  },
  { intent: FitIntent.Custom, label: 'Custom', clearance: 0 },
];

export interface ToleranceInputs {
  readonly desiredClearance: number;
  readonly desiredPrintedPinDiameter: number;
  readonly holeError: number | null;
  readonly nominalMatingDiameter: number;
  readonly outsideError: number | null;
}

export interface ToleranceResult {
  readonly modelledHoleDiameter: number;
  readonly modelledPinDiameter: number;
  readonly radialClearance: number;
  readonly targetPrintedHoleDiameter: number;
}

export interface CalibrationInputs {
  readonly intendedHole: number | null;
  readonly intendedOutside: number | null;
  readonly measuredHole: number | null;
  readonly measuredOutside: number | null;
}

export interface CalibrationErrors {
  readonly holeError: number | null;
  readonly outsideError: number | null;
}

function positive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function calculateTolerance(
  input: ToleranceInputs,
): ToleranceResult | null {
  if (
    !positive(input.nominalMatingDiameter) ||
    !positive(input.desiredPrintedPinDiameter) ||
    !Number.isFinite(input.desiredClearance)
  ) {
    return null;
  }
  const targetPrintedHoleDiameter =
    input.nominalMatingDiameter + input.desiredClearance;
  const modelledHoleDiameter =
    targetPrintedHoleDiameter - (input.holeError ?? 0);
  const modelledPinDiameter =
    input.desiredPrintedPinDiameter - (input.outsideError ?? 0);
  if (
    !positive(targetPrintedHoleDiameter) ||
    !positive(modelledHoleDiameter) ||
    !positive(modelledPinDiameter)
  ) {
    return null;
  }
  return {
    targetPrintedHoleDiameter,
    modelledHoleDiameter,
    modelledPinDiameter,
    radialClearance: input.desiredClearance / 2,
  };
}

export function calculateCalibrationErrors(
  input: CalibrationInputs,
): CalibrationErrors {
  return {
    outsideError:
      input.intendedOutside !== null &&
      input.measuredOutside !== null &&
      positive(input.intendedOutside) &&
      positive(input.measuredOutside)
        ? input.measuredOutside - input.intendedOutside
        : null,
    holeError:
      input.intendedHole !== null &&
      input.measuredHole !== null &&
      positive(input.intendedHole) &&
      positive(input.measuredHole)
        ? input.measuredHole - input.intendedHole
        : null,
  };
}

export function toleranceSummary(
  input: ToleranceInputs,
  result: ToleranceResult,
  intentLabel: string,
): string {
  const error = (value: number | null): string =>
    value === null ? 'not entered' : `${value.toFixed(3)} mm`;
  return [
    'InspectMesh 3D Print Tolerance & Clearance Calculator',
    `Nominal mating-part diameter: ${input.nominalMatingDiameter.toFixed(3)} mm`,
    `Desired printed pin diameter: ${input.desiredPrintedPinDiameter.toFixed(3)} mm`,
    `Fit intent: ${intentLabel}`,
    `Desired diametral clearance: ${input.desiredClearance.toFixed(3)} mm`,
    `Radial clearance: ${result.radialClearance.toFixed(3)} mm`,
    `Target printed hole diameter: ${result.targetPrintedHoleDiameter.toFixed(3)} mm`,
    `Modelled hole diameter: ${result.modelledHoleDiameter.toFixed(3)} mm`,
    `Modelled pin/shaft diameter: ${result.modelledPinDiameter.toFixed(3)} mm`,
    `Measured outside error: ${error(input.outsideError)}`,
    `Measured hole error: ${error(input.holeError)}`,
    'Assumption: measured calibration errors are representative of this printer, material, orientation and settings. Confirm an important fit with a small test print.',
  ].join('\n');
}
