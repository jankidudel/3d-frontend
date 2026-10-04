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
import { calculatePrintPrice } from './print-price';

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
  readonly result = computed(() =>
    calculatePrintPrice({
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
    }),
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
  reset(): void {
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
