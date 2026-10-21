import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { QuotationPage } from './quotation-page';
import { QuotationSession } from './quotation-session';
import { PrintPricePage } from '../print-price/print-price-page';
import { JobCostEditor } from '../print-cost/job-cost-editor';
import { JobPlanningSession } from '../planning/job-planning-session';
import { workedJob } from '../print-cost/job-cost';
import { ProductionBasis } from '../print-price/print-price';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { RenderMode } from '@angular/ssr';
import { serverRoutes } from '../../app.routes.server';
import { sampleQuotation, customerQuotation } from './quotation';

beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [QuotationPage, PrintPricePage, JobCostEditor],
    providers: [
      provideRouter([
        {
          path: PublicRouteUrl.QuoteGenerator.slice(1),
          component: QuotationPage,
        },
        {
          path: PublicRouteUrl.PrintPriceCalculator.slice(1),
          component: PrintPricePage,
        },
      ]),
    ],
  });
});
it('transfers the job total and planned quantity once, then hands off the minimum-adjusted order price', async () => {
  const editor = TestBed.createComponent(JobCostEditor).componentInstance;
  editor.input.set(workedJob());
  await editor.sendPrice();
  const price = TestBed.createComponent(PrintPricePage).componentInstance;
  price.applyJob();
  expect(price.productionBasis()).toBe(ProductionBasis.JobTotal);
  expect(price.jobProductionCost()).toBe(39.192);
  expect(price.quantity()).toBe(5);
  price.sellingFee.set(5);
  price.minimumOrder.set(65);
  await price.createCustomerQuotation();
  const offer = TestBed.inject(QuotationSession).peek()!;
  expect(offer.finalOrderPrice).toBe(65);
  expect(offer.quantity).toBe(5);
  price.jobProductionCost.set(999);
  expect(offer.assumptions.jobProductionCost).toBe(39.192);
});
it('keeps a pending cost offer through component recreation until applied', () => {
  const session = TestBed.inject(JobPlanningSession);
  session.offer({ destination: 'price', value: 39.192, basis: 'job' });
  const first = TestBed.createComponent(PrintPricePage);
  first.destroy();
  const second = TestBed.createComponent(PrintPricePage).componentInstance;
  expect(second.pending()?.value).toBe(39.192);
  second.applyJob();
  expect(session.peek('price')).toBeNull();
});
it('prerenders the public quotation route explicitly', () => {
  expect(serverRoutes).toContainEqual({
    path: PublicRouteUrl.QuoteGenerator.slice(1),
    renderMode: RenderMode.Prerender,
  });
});
it('shows an inert customer-only preview and preserves sample status after editing', () => {
  const fixture = TestBed.createComponent(QuotationPage);
  const page = fixture.componentInstance;
  page.draft.set({
    ...sampleQuotation(),
    reviewNotes: '<script>bad()</script>',
  });
  page.showPreview();
  fixture.detectChanges();
  const document = (fixture.nativeElement as HTMLElement).querySelector(
    '.customer-document',
  )!;
  expect(document.querySelector('script')).toBeNull();
  expect(document.textContent).toContain('<script>bad()</script>');
  expect(document.textContent).toContain('Fictional example');
  page.edited();
  expect(page.draft().fictionalExample).toBe(true);
  expect(customerQuotation(page.draft())?.totalCents).toBe(6030);
});
