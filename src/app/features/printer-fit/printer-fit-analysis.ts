import {
  assessPrinterOrientations,
  DimensionAxis,
  ModelDimensions,
  RotationFitResult,
} from '../../shared/model-dimensions';

export const FitVerdict = {
  Fits: 'Fits',
  FitsAfterRotation: 'Fits after rotation',
  RequiresScaling: 'Requires scaling',
  DoesNotFit: 'Does not fit',
} as const;

export type FitVerdict = (typeof FitVerdict)[keyof typeof FitVerdict];

export interface PrinterFitAssessment {
  readonly effectiveVolume: ModelDimensions;
  readonly currentOrientation: RotationFitResult;
  readonly orientation: RotationFitResult;
  readonly verdict: FitVerdict;
  readonly recommendedScalePercentage: number;
}

export function assessPrinterFit(
  model: ModelDimensions,
  buildVolume: ModelDimensions,
  margin: number,
): PrinterFitAssessment | null {
  if (!Number.isFinite(margin) || margin < 0) {
    return null;
  }
  const effectiveVolume = subtractMargin(buildVolume, margin);
  if (!effectiveVolume) {
    return null;
  }
  const orientations = assessPrinterOrientations(
    model,
    'mm',
    effectiveVolume,
    'mm',
  );
  if (!orientations) {
    return null;
  }
  const orientation = orientations.recommended ?? orientations.nearest;
  if (!orientation) {
    return null;
  }
  const currentFits = orientations.current.fit.fits;
  const rotationFits = orientations.recommended !== null;
  const scale = Math.min(orientation.fit.maximumScalePercentage, 100);
  return {
    effectiveVolume,
    currentOrientation: orientations.current,
    orientation,
    verdict: currentFits
      ? FitVerdict.Fits
      : rotationFits
        ? FitVerdict.FitsAfterRotation
        : scale > 0
          ? FitVerdict.RequiresScaling
          : FitVerdict.DoesNotFit,
    recommendedScalePercentage: scale,
  };
}

export function subtractMargin(
  buildVolume: ModelDimensions,
  margin: number,
): ModelDimensions | null {
  const effectiveVolume = {
    width: buildVolume.width - margin * 2,
    height: buildVolume.height - margin * 2,
    depth: buildVolume.depth - margin * 2,
  };
  if (
    Object.values(effectiveVolume).some(
      (value) => !Number.isFinite(value) || value <= 0,
    )
  ) {
    return null;
  }
  return effectiveVolume;
}

export function axisLabel(axis: DimensionAxis): string {
  return { width: 'X', height: 'Y', depth: 'Z' }[axis];
}
