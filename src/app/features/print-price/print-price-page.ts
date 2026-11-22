import { QuotationSession } from '../quotation/quotation-session';
import { localCalendarDay, moneyCents } from '../quotation/quotation';
import {
  PlannerCurrency,
  chosenCurrency,
  rememberCurrency,
} from '../repeat-workflows/currency-preference';
import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { createPdf } from '../../shared/pdf-engine';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { jobRecordLines } from '../print-cost/job-cost';
import {
  JobPlanningSession,
  PlanningDestination,
} from '../planning/job-planning-session';
import {
  PricingMethod,
  ProductionBasis,
  calculatePrintPrice,
  quoteWorksheet,
  quoteWorksheetLines,
} from './print-price';
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
export class PrintPricePage implements OnDestroy {
  private readonly session = inject(JobPlanningSession);
  private readonly quotations = inject(QuotationSession);
  private readonly router = inject(Router);
  readonly guides = GuideRouteUrl;
  readonly sourceSummary = computed(() => {
    const record = this.sourceRecord();
    return record ? jobRecordLines(record).join('\n') : '';
  });
  readonly methods = PricingMethod;
  readonly bases = ProductionBasis;
  readonly productionBasis = signal<ProductionBasis>(ProductionBasis.PerItem);
  readonly pricingMethod = signal<PricingMethod>(PricingMethod.Margin);
  readonly jobProductionCost = signal(0);
  readonly sellingFee = signal(0);
  readonly fixedFee = signal(0);
  readonly feesInCost = signal(false);
  readonly pending = signal(this.session.peek(PlanningDestination.Price));
  readonly sourceRecord = signal(this.session.priceSource ?? null);
  readonly copyFallback = signal('');
  readonly formula = computed(() =>
    this.pricingMethod() === PricingMethod.Margin
      ? 'P = (K + F) / (1 - m - f)'
      : 'P = (K × (1 + u) + F) / (1 - f); target profit is u × K after fees',
  );
  readonly routeUrl = PublicRouteUrl;
  readonly currency = signal<PlannerCurrency>(chosenCurrency());
  readonly currencies = Object.values(PlannerCurrency);
  readonly materialPrice = signal(20);
  readonly materialUsed = signal(80);
  readonly waste = signal(0);
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
  readonly quoteDate = signal(localCalendarDay());
  readonly description = signal('');
  readonly finishing = signal(0);
  readonly packaging = signal(0);
  readonly extra = signal(0);
  readonly exportMessage = signal('');
  private readonly analytics = inject(AnalyticsService);
  readonly inputs = computed(() => ({
    productionBasis: this.productionBasis(),
    jobProductionCost: this.jobProductionCost(),
    pricingMethod: this.pricingMethod(),
    sellingFeePercent: this.sellingFee(),
    fixedSellingFee: this.fixedFee(),
    feesAlreadyInCost: this.feesInCost(),
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
  readonly worksheet = computed(() => {
    const worksheet = quoteWorksheet(
      this.inputs(),
      this.currency(),
      this.reference(),
      this.quoteDate(),
    );
    return worksheet
      ? {
          ...worksheet,
          sourceJob:
            this.productionBasis() === ProductionBasis.JobTotal
              ? this.sourceRecord()
              : null,
        }
      : null;
  });
  constructor() {
    const draft = this.session.priceDraft;
    if (draft) {
      const fields = {
        materialPrice: 'materialPricePerKg',
        materialUsed: 'materialUsedGrams',
        waste: 'wastePercent',
        printHours: 'printHours',
        watts: 'printerWatts',
        electricity: 'electricityPricePerKwh',
        machineWear: 'machineWearPerHour',
        labourHours: 'labourHours',
        labourRate: 'labourRate',
        overhead: 'fixedOrderOverhead',
        failure: 'failurePercent',
        quantity: 'quantity',
        margin: 'targetMarginPercent',
        minimumOrder: 'minimumOrderCharge',
        finishing: 'finishingCostPerItem',
        packaging: 'packagingPerOrder',
        extra: 'extraPerOrder',
        jobProductionCost: 'jobProductionCost',
        sellingFee: 'sellingFeePercent',
        fixedFee: 'fixedSellingFee',
      } as const;
      for (const [field, key] of Object.entries(fields)) {
        const value = draft[key];
        if (typeof value === 'number') {
          (
            this[field as keyof typeof fields] as { set(value: number): void }
          ).set(value);
        }
      }
      this.productionBasis.set(draft['productionBasis'] as ProductionBasis);
      this.pricingMethod.set(draft['pricingMethod'] as PricingMethod);
      this.feesInCost.set(draft['feesAlreadyInCost'] === true);
      this.reference.set(String(draft['reference'] ?? ''));
      this.description.set(String(draft['description'] ?? ''));
      this.quoteDate.set(String(draft['quoteDate'] ?? ''));
      this.currency.set(draft['currency'] as PlannerCurrency);
    }
    inject(SeoService).apply({
      title: '3D Printing Price Calculator: What to Charge | InspectMesh',
      description:
        'Price an entered job production total or identical parts with explicit margin or markup, user-entered selling fees and a minimum order price.',
      path: PublicRouteUrl.PrintPriceCalculator,
    });
  }
  ngOnDestroy(): void {
    this.session.priceSource = this.sourceRecord();
    this.session.priceDraft = {
      ...this.inputs(),
      reference: this.reference(),
      description: this.description(),
      quoteDate: this.quoteDate(),
      currency: this.currency(),
    };
  }
  setCurrency(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PlannerCurrency;
    this.currency.set(value);
    rememberCurrency(value);
  }
  setNumber(target: keyof PrintPricePage, event: Event): void {
    (this[target] as unknown as { set(value: number): void }).set(
      (event.target as HTMLInputElement).value === ''
        ? NaN
        : Number((event.target as HTMLInputElement).value),
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
  applyJob(): void {
    const offer = this.pending();
    if (!offer) {
      return;
    }
    this.jobProductionCost.set(offer.value);
    this.productionBasis.set(ProductionBasis.JobTotal);
    if (
      offer.currency &&
      this.currencies.includes(offer.currency as PlannerCurrency)
    ) {
      this.currency.set(offer.currency as PlannerCurrency);
    }
    this.sourceRecord.set(offer.record ?? null);
    if (offer.plannedQuantity) {
      this.quantity.set(offer.plannedQuantity);
    }
    this.session.take(PlanningDestination.Price);
    this.pending.set(null);
    this.exportMessage.set(
      'Applied job production total and planned quantity when supplied. Reference and pricing choices are retained. Quantity does not multiply K.',
    );
  }
  dismissJob(): void {
    this.session.take(PlanningDestination.Price);
    this.pending.set(null);
  }
  readonly canCreateQuotation = computed(() => {
    const price = this.result();
    return (
      !!price &&
      price.orderQuote > 0 &&
      moneyCents(price.orderQuote) !== null &&
      this.reference().length <= 200 &&
      this.description().length <= 200
    );
  });
  async createCustomerQuotation(): Promise<void> {
    const price = this.result();
    if (!price || !this.canCreateQuotation()) {
      this.exportMessage.set(
        'Enter valid pricing inputs and a positive final order price first.',
      );
      return;
    }
    this.quotations.offer({
      schemaVersion: 1,
      sourceRoute: PublicRouteUrl.PrintPriceCalculator,
      timestamp: new Date().toISOString(),
      currency: this.currency(),
      finalOrderPrice: price.orderQuote,
      quantity: this.quantity(),
      reference: this.reference(),
      description: this.description(),
      assumptions: structuredClone(this.inputs()),
    });
    await this.router.navigateByUrl(PublicRouteUrl.QuoteGenerator);
  }
  async copyQuote(): Promise<void> {
    const result = this.result();
    if (!result) {
      return;
    }
    const summary = `Order estimate ${this.reference()}: production ${this.format(result.productionCostForOrder)}; ${this.pricingMethod()} target ${this.margin()}%; selling fees ${this.sellingFee()}% of price + ${this.fixedFee()} per order; price ${this.format(result.orderQuote)}; realised margin ${result.realisedMarginPercent.toFixed(2)}%. Quantity ${this.quantity()} is planned, not delivered. Tax and unentered costs excluded.`;
    try {
      await navigator.clipboard.writeText(summary);
      this.exportMessage.set('Quote summary copied.');
    } catch {
      this.copyFallback.set(summary);
      this.exportMessage.set('Select and copy the summary below.');
    }
  }
  async downloadPdf(): Promise<void> {
    const worksheet = this.worksheet();
    if (!worksheet) {
      return;
    }
    const pdf = await createPdf();
    pdf.setFontSize(10);
    const source = worksheet.sourceJob
      ? jobRecordLines(worksheet.sourceJob)
      : [];
    const lines: string[] = pdf.splitTextToSize(
      [...quoteWorksheetLines(worksheet), ...source].join('\n'),
      180,
    );
    let y = 18;
    for (const line of lines) {
      if (y > 280) {
        pdf.addPage();
        y = 18;
      }
      pdf.text(line, 14, y);
      y += 5;
    }
    pdf.save('inspectmesh-internal-pricing-worksheet.pdf');
    this.exportMessage.set(
      'Internal pricing worksheet PDF download requested.',
    );
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
    this.productionBasis.set(ProductionBasis.PerItem);
    this.pricingMethod.set(PricingMethod.Margin);
    this.sellingFee.set(0);
    this.fixedFee.set(0);
    this.feesInCost.set(false);
    this.waste.set(0);
    this.finishing.set(0);
    this.packaging.set(0);
    this.extra.set(0);
    this.materialPrice.set(20);
    this.materialUsed.set(80);
    this.waste.set(0);
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
