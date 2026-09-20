import { PrinterRecord } from './printer-catalogue';

export function validatePrinterCatalogue(
  printers: readonly PrinterRecord[],
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const printer of printers) {
    if (ids.has(printer.id)) {
      errors.push(`Duplicate printer id: ${printer.id}`);
    }
    if (slugs.has(printer.slug)) {
      errors.push(`Duplicate printer slug: ${printer.slug}`);
    }
    ids.add(printer.id);
    slugs.add(printer.slug);
    if (printer.published !== false) {
      if (
        printer.buildVolumeMm.some(
          (value) => !Number.isFinite(value) || value <= 0,
        )
      ) {
        errors.push(`${printer.id} has an invalid build volume.`);
      }
      if (
        !printer.summary ||
        !printer.bestFor ||
        !printer.limitations?.length ||
        !printer.lastVerified
      ) {
        errors.push(`${printer.id} lacks required published editorial data.`);
      }
    }
    if (printer.indicativeUsdPrice !== undefined && !printer.lastVerified) {
      errors.push(`${printer.id} has an undated indicative price.`);
    }
    for (const source of printer.sources) {
      if (!source.url || !source.label || !source.lastVerified) {
        errors.push(`${printer.id} has an incomplete source reference.`);
      }
    }
  }
  return errors;
}
