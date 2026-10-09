import {
  PlannerCurrency,
  chosenCurrency,
  rememberCurrency,
} from '../repeat-workflows/currency-preference';
import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { calculatePrintPrice, quoteWorksheet } from './print-price';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';

@Component({
  selector: 'app-print-price-page',
  imports: [ToolEvidenceComponent, RouterLink],
  templateUrl: './print-price-page.html',
  styleUrl: './print-price-page.scss',
})
export class PrintPricePage {
  readonly routeUrl = PublicRouteUrl;
  readonly currency = signal<PlannerCurrency>(chosenCurrency());
  readonly currencies = Object.values(PlannerCurrency);
  readonly materialPrice = signal(20);
  readonly materialUsed = signal(80);
  readonly waste = signal(5);
  readonly printHours = signal(4);
  readonly watts = signal(120);
  readonly electricity = signal(0.16);
  readonly machineWear = signal(0.25);
  readonly labourHours = signal(0.25);
  readonly labourRate = signal(20);
  readonly overhead = signal(2);
  readonly failure = signal(10);
  readonly quantity = signal(1);
  readonly margin = signal(30);
  readonly minimumOrder = signal(0);
  readonly reference = signal('');
  readonly quoteDate = signal(new Date().toISOString().slice(0, 10));
  readonly finishing = signal(0);
  readonly packaging = signal(0);
  readonly extra = signal(0);
  readonly exportMessage = signal('');
  private readonly analytics = inject(AnalyticsService);
  readonly inputs = computed(() => ({
    materialPricePerKg: this.materialPrice(),
    materialUsedGrams: this.materialUsed(),
    wastePercent: this.waste(),
    printHours: this.printHours(),
    printerWatts: this.watts(),
    electricityPricePerKwh: this.electricity(),
    machineWearPerHour: this.machineWear(),
    labourHours: this.labourHours(),
    labourRate: this.labourRate(),
    fixedOrderOverhead: this.overhead(),
    failurePercent: this.failure(),
    quantity: this.quantity(),
    targetMarginPercent: this.margin(),
    minimumOrderCharge: this.minimumOrder(),
    finishingCostPerItem: this.finishing(),
    packagingPerOrder: this.packaging(),
    extraPerOrder: this.extra(),
  }));
  readonly result = computed(() => calculatePrintPrice(this.inputs()));
  readonly worksheet = computed(() =>
    quoteWorksheet(
      this.inputs(),
      this.currency(),
      this.reference(),
      this.quoteDate(),
    ),
  );
  constructor() {
    inject(SeoService).apply({
      title:
        '3D Printing Price Calculator - Calculate What to Charge | InspectMesh',
      description:
        'Calculate a fair 3D printing price from material, print time, electricity, labor, overhead, failure allowance, quantity and target profit margin.',
      path: PublicRouteUrl.PrintPriceCalculator,
    });
  }
  setCurrency(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PlannerCurrency;
    this.currency.set(value);
    rememberCurrency(value);
  }
  setNumber(target: keyof PrintPricePage, event: Event): void {
    (this[target] as unknown as { set(value: number): void }).set(
      Number((event.target as HTMLInputElement).value),
    );
  }
  format(value: number): string {
    if (this.currency() === PlannerCurrency.Other) {
      return `${value.toFixed(2)} (chosen currency)`;
    }
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: this.currency(),
      maximumFractionDigits: 2,
    }).format(value);
  }
  copyQuote(): void {
    const result = this.result();
    if (result) {
      navigator.clipboard?.writeText(
        `Quote: ${this.quantity()} parts at ${this.format(result.recommendedPricePerItem)} each; total ${this.format(result.orderQuote)}.`,
      );
    }
  }
  printWorksheet(): void {
    window.print();
    this.analytics.trackWorkflow(
      AnalyticsEvent.ReportExported,
      'quote_worksheet',
      'print',
    );
  }
  exportWorksheet(): void {
    const worksheet = this.worksheet();
    if (!worksheet) {
      return;
    }
    try {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(worksheet, null, 2)], {
          type: 'application/json',
        }),
      );
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `inspectmesh-quote-${this.quoteDate() || 'undated'}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.exportMessage.set(
        'Worksheet download requested. Check your browser downloads.',
      );
      this.analytics.trackWorkflow(
        AnalyticsEvent.ReportExported,
        'quote_worksheet',
        'json',
      );
    } catch {
      this.exportMessage.set(
        'Download could not start. Use Print worksheet or try again.',
      );
    }
  }
  reset(): void {
    this.finishing.set(0);
    this.packaging.set(0);
    this.extra.set(0);
    this.materialPrice.set(20);
    this.materialUsed.set(80);
    this.waste.set(5);
    this.printHours.set(4);
    this.watts.set(120);
    this.electricity.set(0.16);
    this.machineWear.set(0.25);
    this.labourHours.set(0.25);
    this.labourRate.set(20);
    this.overhead.set(2);
    this.failure.set(10);
    this.quantity.set(1);
    this.margin.set(30);
    this.minimumOrder.set(0);
  }
}
