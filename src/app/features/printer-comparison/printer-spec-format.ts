/** Shown when the manufacturer sources checked do not state a value. */
export const PRINTER_SPEC_NOT_STATED = 'Not stated in the sources checked';

export function formatPrinterDimensions(
  value: readonly number[] | null,
): string {
  if (
    !value ||
    value.some((dimension) => !Number.isFinite(dimension) || dimension <= 0)
  ) {
    return PRINTER_SPEC_NOT_STATED;
  }
  return `${value.join(' x ')} mm`;
}
export function formatPrinterNumber(
  value: number | null,
  unit: string,
): string {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return PRINTER_SPEC_NOT_STATED;
  }
  return `${value.toLocaleString('en-US')} ${unit}`;
}

export function formatPrinterText(value: string): string {
  return value.trim() ? value : PRINTER_SPEC_NOT_STATED;
}
