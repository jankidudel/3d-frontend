import {
  formatPrinterDimensions,
  formatPrinterNumber,
  formatPrinterText,
} from './printer-spec-format';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PrinterSlug, PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import {
  CuratedComparison,
  comparisonPrinters,
  curatedComparisonsBySlug,
} from './comparison-catalogue';
import { PrinterRecord } from './printer-catalogue';

const CUBIC_MM_PER_LITRE = 1_000_000;
const PERCENT = 100;

function nominalLitres(printer: PrinterRecord): number {
  const [x, y, z] = printer.buildVolumeMm;
  return (x * y * z) / CUBIC_MM_PER_LITRE;
}

function formatLitres(litres: number): string {
  return litres.toFixed(1);
}

@Component({
  selector: 'app-printer-pair-page',
  imports: [RouterLink],
  templateUrl: './printer-pair-page.html',
  styleUrl: './printer-pair-page.scss',
})
export class PrinterPairPage {
  readonly printerSlug = PrinterSlug;
  readonly routeUrl = PublicRouteUrl;
  readonly comparison: CuratedComparison;
  readonly printers: readonly [PrinterRecord, PrinterRecord];
  readonly left = computed(() => this.printers[0]);
  readonly right = computed(() => this.printers[1]);
  readonly publishedPrinters = computed(() =>
    this.printers.filter((printer) => printer.published !== false),
  );
  readonly sizeSummary = computed(() => {
    const left = this.left();
    const right = this.right();
    const leftLitres = nominalLitres(left);
    const rightLitres = nominalLitres(right);
    if (leftLitres === rightLitres) {
      return `Both have the same nominal build volume of ${formatLitres(leftLitres)} litres.`;
    }
    const [larger, smaller, largerLitres, smallerLitres] =
      leftLitres > rightLitres
        ? [left, right, leftLitres, rightLitres]
        : [right, left, rightLitres, leftLitres];
    const percent = Math.round(
      ((largerLitres - smallerLitres) / smallerLitres) * PERCENT,
    );
    return `The ${larger.displayName} has about ${percent}% more nominal build volume (${formatLitres(largerLitres)} litres) than the ${smaller.displayName} (${formatLitres(smallerLitres)} litres).`;
  });

  constructor() {
    const path = inject(Router).url;
    const slug = path.split('/').at(-1) ?? '';
    const comparison = curatedComparisonsBySlug.get(slug);
    if (!comparison) {
      throw new Error(`Unknown curated comparison: ${slug}`);
    }
    this.comparison = comparison;
    this.printers = comparisonPrinters(comparison);
    inject(SeoService).apply({
      title: `${comparison.title} | InspectMesh`,
      description: comparison.description,
      path,
      openGraphType: 'article',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'FAQPage',
            mainEntity: comparison.faq.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          },
        ],
      },
    });
  }

  compareUrl(slug: string): string {
    return `${PublicRouteUrl.Compare}/${slug}`;
  }

  readonly formatDimensions = formatPrinterDimensions;
  readonly formatNumber = formatPrinterNumber;
  readonly formatText = formatPrinterText;

  price(printer: PrinterRecord): string {
    return printer.indicativeUsdPrice === undefined
      ? 'Not confirmed'
      : `$${printer.indicativeUsdPrice.toLocaleString('en-US')}`;
  }
}
