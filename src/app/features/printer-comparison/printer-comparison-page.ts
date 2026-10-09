import {
  formatPrinterDimensions,
  formatPrinterNumber,
} from './printer-spec-format';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { curatedComparisons } from './comparison-catalogue';
import { PrinterRecord, printers, printerById } from './printer-catalogue';

interface ComparisonRow {
  readonly label: string;
  readonly left: string;
  readonly right: string;
}

@Component({
  selector: 'app-printer-comparison-page',
  imports: [RouterLink],
  templateUrl: './printer-comparison-page.html',
  styleUrl: './printer-comparison-page.scss',
})
export class PrinterComparisonPage {
  readonly routeUrl = PublicRouteUrl;
  readonly printers = printers;
  readonly curatedComparisons = curatedComparisons;
  readonly leftId = signal('bambu-lab-p1s');
  readonly rightId = signal('bambu-lab-p2s');
  readonly differencesOnly = signal(false);
  readonly left = computed(() => printerById(this.leftId()));
  readonly right = computed(() => printerById(this.rightId()));
  readonly curated = computed(() => {
    const found = curatedComparisons.find(
      (comparison) =>
        comparison.leftId === this.leftId() &&
        comparison.rightId === this.rightId(),
    );
    return found ?? null;
  });
  readonly rows = computed(() =>
    this.comparisonRows(this.left(), this.right()),
  );
  readonly visibleRows = computed(() =>
    this.differencesOnly()
      ? this.rows().filter((row) => row.left !== row.right)
      : this.rows(),
  );

  constructor() {
    inject(SeoService).apply({
      title: 'Compare 3D Printers - Specs, Features and Costs | InspectMesh',
      description:
        'Compare 3D printers side by side by price context, build volume, enclosure, materials, multicolour support, features and running-cost considerations.',
      path: PublicRouteUrl.Compare3dPrinters,
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: '3D printer comparison catalogue',
        itemListElement: printers.map((printer, position) => ({
          '@type': 'ListItem',
          position: position + 1,
          name: printer.displayName,
        })),
      },
    });
  }

  setLeft(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id !== this.rightId()) {
      this.leftId.set(id);
    }
  }

  setRight(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id !== this.leftId()) {
      this.rightId.set(id);
    }
  }

  swap(): void {
    const left = this.leftId();
    this.leftId.set(this.rightId());
    this.rightId.set(left);
  }

  comparisonUrl(slug: string): string {
    return `${PublicRouteUrl.Compare}/${slug}`;
  }

  readonly formatDimensions = formatPrinterDimensions;
  readonly formatNumber = formatPrinterNumber;

  formatPrice(printer: PrinterRecord): string {
    if (printer.indicativeUsdPrice === undefined) {
      return 'Not confirmed';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(printer.indicativeUsdPrice);
  }

  private comparisonRows(
    left: PrinterRecord,
    right: PrinterRecord,
  ): readonly ComparisonRow[] {
    return [
      {
        label: 'Indicative base price',
        left: this.formatPrice(left),
        right: this.formatPrice(right),
      },
      { label: 'Status', left: left.status, right: right.status },
      {
        label: 'Build volume',
        left: this.formatDimensions(left.buildVolumeMm),
        right: this.formatDimensions(right.buildVolumeMm),
      },
      {
        label: 'Machine dimensions',
        left: this.formatDimensions(left.machineDimensionsMm),
        right: this.formatDimensions(right.machineDimensionsMm),
      },
      {
        label: 'Enclosure',
        left: left.enclosed ? 'Enclosed' : 'Open frame',
        right: right.enclosed ? 'Enclosed' : 'Open frame',
      },
      {
        label: 'Maximum nozzle temperature',
        left: this.formatNumber(left.maxNozzleTemperatureC, 'C'),
        right: this.formatNumber(right.maxNozzleTemperatureC, 'C'),
      },
      {
        label: 'Maximum bed temperature',
        left: this.formatNumber(left.maxBedTemperatureC, 'C'),
        right: this.formatNumber(right.maxBedTemperatureC, 'C'),
      },
      {
        label: 'Maximum claimed speed',
        left: this.formatNumber(left.maxClaimedSpeedMmS, 'mm/s'),
        right: this.formatNumber(right.maxClaimedSpeedMmS, 'mm/s'),
      },
      {
        label: 'Maximum claimed acceleration',
        left: this.formatNumber(left.maxClaimedAccelerationMmS2, 'mm/s²'),
        right: this.formatNumber(right.maxClaimedAccelerationMmS2, 'mm/s²'),
      },
      { label: 'Camera', left: left.camera, right: right.camera },
      {
        label: 'Multicolour',
        left: left.multicolour,
        right: right.multicolour,
      },
      {
        label: 'Material guidance',
        left: left.materials,
        right: right.materials,
      },
    ];
  }
}
