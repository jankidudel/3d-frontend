/** Batch workflow limits and settings, usable without loading three.js. */
export const WorkflowLimits = {
  FileBytes: 5 * 1024 * 1024,
  ExpandedPackageBytes: 20 * 1024 * 1024,
  Triangles: 100000,
  FreeQueue: 3,
  DevQueue: 20,
  CompareSamples: 5000,
} as const;
/** Development offers never establish a production subscription entitlement. */
export function collectionAllowance(
  development: boolean,
  preview: boolean,
): number {
  return development && preview
    ? WorkflowLimits.DevQueue
    : WorkflowLimits.FreeQueue;
}
export const QueueState = {
  Waiting: 'waiting',
  Reading: 'reading',
  Checking: 'checking',
  Complete: 'complete',
  Failed: 'failed',
  Cancelled: 'cancelled',
} as const;
export type QueueState = (typeof QueueState)[keyof typeof QueueState];
export const ModelUnits = { Millimetres: 'mm', Inches: 'in' } as const;
export type ModelUnits = (typeof ModelUnits)[keyof typeof ModelUnits];
export interface CheckSettings {
  readonly stlUnit: ModelUnits;
  readonly printer: {
    readonly name: string;
    readonly dimensions: readonly [number, number, number];
  } | null;
  readonly thicknessThresholdMm: number;
}

export function csvCell(value: unknown): string {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new Error(
      'A nonfinite report value cannot be exported. Rerun the affected file.',
    );
  }
  const text = String(value ?? '');
  // Excel/LibreOffice: prefix untrusted formula-like text with an apostrophe.
  // Ignore leading whitespace and ASCII controls when detecting a formula.
  // Numeric values are trusted typed numbers, not customer-controlled text.
  const firstMeaningful = Array.from(text).find(
    (character) => character.charCodeAt(0) > 32 && character.trim().length > 0,
  );
  const safe =
    typeof value === 'string' && /^[=+\-@]/.test(firstMeaningful ?? '')
      ? `'${text}`
      : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
