import {
  formatPrinterDimensions,
  formatPrinterNumber,
} from './printer-spec-format';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import {
  CuratedComparison,
  comparisonPrinters,
  curatedComparisonsBySlug,
} from './comparison-catalogue';
import { PrinterRecord } from './printer-catalogue';

@Component({
  selector: 'app-printer-pair-page',
  imports: [RouterLink],
  templateUrl: './printer-pair-page.html',
  styleUrl: './printer-pair-page.scss',
})
export class PrinterPairPage {
  readonly routeUrl = PublicRouteUrl;
  readonly comparison: CuratedComparison;
  readonly printers: readonly [PrinterRecord, PrinterRecord];
  readonly left = computed(() => this.printers[0]);
  readonly right = computed(() => this.printers[1]);

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

  price(printer: PrinterRecord): string {
    return printer.indicativeUsdPrice === undefined
      ? 'Not confirmed'
      : `$${printer.indicativeUsdPrice.toLocaleString('en-US')}`;
  }
}
