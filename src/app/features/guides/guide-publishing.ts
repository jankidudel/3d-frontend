import type { GuideRegistryEntry } from './guide-registry-validation.ts';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function guidesAsOfDate(
  value = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env?.['GUIDES_AS_OF_DATE'],
): string {
  if (value !== undefined) {
    if (!isDateOnlyUtc(value)) {
      throw new Error(
        'GUIDES_AS_OF_DATE must use YYYY-MM-DD and be a real UTC date.',
      );
    }
    return value;
  }
  return new Date().toISOString().slice(0, 10);
}

export function isDateOnlyUtc(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }
  return (
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value
  );
}

export function isGuidePublic(
  entry: GuideRegistryEntry,
  asOf = guidesAsOfDate(),
): boolean {
  return entry.enabled && entry.publishDate <= asOf;
}
