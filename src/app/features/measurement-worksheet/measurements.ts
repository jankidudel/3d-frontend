export interface Reading {
  readonly value: number | null;
  readonly included: boolean;
  readonly reason: string;
}

export interface ReadingSummary {
  readonly count: number;
  readonly mean: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly range: number;
}

export const emptyReading = (): Reading => ({
  value: null,
  included: true,
  reason: '',
});

export function summarizeReadings(
  readings: readonly Reading[],
): ReadingSummary | null {
  if (
    readings.some(
      (reading) =>
        reading.value === null ||
        !Number.isFinite(reading.value) ||
        reading.value <= 0 ||
        (!reading.included && !reading.reason.trim()),
    )
  ) {
    return null;
  }
  const values = readings
    .filter((reading) => reading.included)
    .map((reading) => reading.value as number);
  if (!values.length) {
    return null;
  }
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return {
    count: values.length,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    minimum,
    maximum,
    range: maximum - minimum,
  };
}

export interface WorksheetNotes {
  readonly label: string;
  readonly date: string;
  readonly printer: string;
  readonly material: string;
  readonly profile: string;
  readonly feature: string;
  readonly orientation: string;
  readonly method: string;
  readonly conditioning: string;
  readonly confirmation: string;
  readonly outcome: string;
}

export const worksheetFields: readonly (keyof WorksheetNotes)[] = [
  'label',
  'date',
  'printer',
  'material',
  'profile',
  'feature',
  'orientation',
  'method',
  'conditioning',
  'confirmation',
  'outcome',
];
export const worksheetLabels: Record<keyof WorksheetNotes, string> = {
  label: 'Record label',
  date: 'Record date',
  printer: 'Printer (optional)',
  material: 'Material (optional)',
  profile: 'Slicer version and profile (optional)',
  feature: 'Feature and datum / measuring points',
  orientation: 'Orientation / axis and measurement direction',
  method: 'Measuring instrument and method',
  conditioning: 'Cooling / conditioning notes',
  confirmation: 'Proposed confirmation test',
  outcome: 'Your observed outcome (no automatic acceptance)',
};
export function emptyWorksheetNotes(): WorksheetNotes {
  return {
    label: '',
    date: '',
    printer: '',
    material: '',
    profile: '',
    feature: '',
    orientation: '',
    method: '',
    conditioning: '',
    confirmation: '',
    outcome: '',
  };
}

export function buildWorksheet(calculation: unknown, notes: WorksheetNotes) {
  return {
    schema: 'inspectmesh-measurement-1',
    units: 'mm',
    notes,
    calculation,
    limitations:
      'Planning record, not certified inspection or production acceptance. Range is recorded spread, not instrument uncertainty or total manufacturing tolerance. Only comparable sizes, orientations and conditions may share a set. Validate the proposed adjustment with a representative test.',
  };
}

export function worksheetText(
  record: ReturnType<typeof buildWorksheet>,
): string {
  const lines = [
    'InspectMesh measurement worksheet',
    'Dimensions and recorded spread in mm; scale and shrinkage in percent.',
    '',
  ];
  for (const field of worksheetFields) {
    lines.push(
      `${worksheetLabels[field]}: ${record.notes[field] || 'not recorded'}`,
    );
  }
  const labels: Record<string, string> = {
    matingMode: 'Mating component',
    fitIntent: 'Fit intent',
    fixedCounterpartDiameter: 'Fixed counterpart outside diameter (mm)',
    desiredProducedPin: 'Target produced pin (mm)',
    diametralClearance: 'Diametral clearance (mm)',
    holeErrorApplied: 'Applied hole error (mm)',
    outsideErrorApplied: 'Applied pin error (mm)',
    nominal: 'Designed test dimension (mm)',
    target: 'Desired final dimension (mm)',
    mean: 'Mean (mm)',
    minimum: 'Minimum (mm)',
    maximum: 'Maximum (mm)',
    range: 'Range (mm)',
    count: 'Included reading count',
    modelledHoleDiameter: 'Provisional model hole (mm)',
    modelledPinDiameter: 'Provisional model pin (mm)',
    targetPrintedHoleDiameter: 'Target produced hole (mm)',
    radialClearance: 'Radial clearance (mm)',
    compensatedModelDimension: 'Provisional model dimension (mm)',
    scalePercent: 'Scale (%)',
    shrinkagePercent: 'Shrinkage (%)',
    holeError: 'Hole error (mm)',
    outsideError: 'Pin error (mm)',
    calculatedErrors: 'Errors from current readings',
    appliedEvidence: 'Measurement evidence retained when errors were applied',
  };
  const label = (key: string): string =>
    labels[key] ??
    key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (character) => character.toUpperCase());
  function visit(value: unknown, key: string, indent: string): void {
    if (Array.isArray(value)) {
      lines.push(`${indent}${label(key)}:`);
      value.forEach((item: Reading, index) => {
        lines.push(
          `${indent}  Reading ${index + 1}: ${item.value ?? 'not recorded'} mm; ${item.included ? 'included' : 'excluded'}${item.reason ? '; reason: ' + item.reason : ''}`,
        );
      });
    } else if (value !== null && typeof value === 'object') {
      lines.push(`${indent}${label(key)}:`);
      for (const [childKey, item] of Object.entries(value)) {
        visit(item, childKey, indent + '  ');
      }
    } else {
      const display =
        typeof value === 'number'
          ? Number.isFinite(value)
            ? Number(value.toFixed(6)).toString()
            : 'invalid / incomplete'
          : value === 'printed-pair'
            ? 'Both parts printed'
            : value === 'fixed'
              ? 'Fixed external component'
              : value === null || value === ''
                ? 'not recorded / not applicable'
                : String(value);
      lines.push(`${indent}${label(key)}: ${display}`);
    }
  }
  lines.push('');
  visit(record.calculation, 'Calculation', '');
  lines.push(
    '',
    record.limitations,
    'JSON retains full numerical precision; this readable worksheet rounds calculated values to six decimal places.',
  );
  return lines.join('\n');
}
