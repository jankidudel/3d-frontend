/** Presentation only. Geometry, boundary decisions and JSON retain their numbers. */
export function displayNumber(value: unknown, diagnostic = false): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'Unavailable';
  }
  if (value === 0) {
    return '0';
  }
  if (Math.abs(value) < 0.001 || Math.abs(value) >= 1e9) {
    return value.toExponential(2).replace(/\.?(0+)(?=e)/, '');
  }
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: diagnostic ? 6 : 3,
    ...(diagnostic ? { maximumSignificantDigits: 3 } : {}),
  }).format(value);
}
export function displayVector(
  values: readonly number[],
  separator = ' / ',
): string {
  return values.map((value) => displayNumber(value)).join(separator);
}
export function displayBounds(bounds: {
  min: readonly number[];
  max: readonly number[];
  spans: readonly number[];
}): string {
  return `Min ${displayVector(bounds.min)}; max ${displayVector(bounds.max)}; spans ${displayVector(bounds.spans, ' × ')} mm (X / Y / Z)`;
}
export const NUMERIC_DISPLAY_NOTE =
  'Displayed values are rounded; verification and boundary decisions use stored numerical precision. Display decimals do not establish measurement accuracy.';
