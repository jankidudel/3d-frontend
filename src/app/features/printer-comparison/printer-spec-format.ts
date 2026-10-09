export function formatPrinterDimensions(
  value: readonly number[] | null,
): string {
  if (
    !value ||
    value.some((dimension) => !Number.isFinite(dimension) || dimension <= 0)
  ) {
    return 'Not verified';
  }
  return `${value.join(' x ')} mm`;
}
export function formatPrinterNumber(
  value: number | null,
  unit: string,
): string {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return 'Not verified';
  }
  return `${value.toLocaleString('en-US')} ${unit}`;
}
