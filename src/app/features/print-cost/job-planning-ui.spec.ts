import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import { JobCostEditor } from './job-cost-editor';
import { workedJob, jobRecord } from './job-cost';
import { PrintPricePage } from '../print-price/print-price-page';
import { PlanningPage } from '../planning/planning-page';
import { PlannerKind } from '../planning/planner-kind';
import {
  JobPlanningSession,
  PlanningDestination,
} from '../planning/job-planning-session';
import { ProductionBasis } from '../print-price/print-price';
function configure(kind: PlannerKind = PlannerKind.Spool) {
  TestBed.configureTestingModule({
    imports: [JobCostEditor, PrintPricePage, PlanningPage],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { data: { planner: kind } } },
      },
      { provide: AnalyticsService, useValue: { trackWorkflow: vi.fn() } },
      { provide: SeoService, useValue: { apply: vi.fn() } },
    ],
  });
  return TestBed.inject(JobPlanningSession);
}
afterEach(() => vi.unstubAllGlobals());
it('requires explicit job apply and preserves recipient inputs and prior quote on return', () => {
  const s = configure();
  s.offer({
    destination: PlanningDestination.Price,
    value: 39.192,
    basis: 'job',
    currency: 'OTHER',
    record: jobRecord(workedJob())!,
  });
  const fixture = TestBed.createComponent(PrintPricePage);
  const p = fixture.componentInstance;
  p.reference.set('Existing reference');
  p.quantity.set(7);
  p.margin.set(35);
  expect(p.productionBasis()).toBe(ProductionBasis.PerItem);
  p.applyJob();
  expect(p.productionBasis()).toBe(ProductionBasis.JobTotal);
  expect(p.jobProductionCost()).toBe(39.192);
  expect(p.reference()).toBe('Existing reference');
  expect(p.quantity()).toBe(7);
  expect(p.margin()).toBe(35);
  expect(p.worksheet()?.sourceJob?.inputs.plates).toHaveLength(2);
  fixture.destroy();
  const restored = TestBed.createComponent(PrintPricePage).componentInstance;
  expect(restored.reference()).toBe('Existing reference');
  expect(restored.quantity()).toBe(7);
  expect(restored.sourceRecord()?.result.total).toBe(39.192);
});
it('spool offer replaces only consumption after confirming compatibility, preserving reserve and weighed spool', () => {
  const s = configure();
  s.offer({
    destination: PlanningDestination.Spool,
    value: 160,
    basis: 'one compatible scope',
  });
  const p = TestBed.createComponent(PlanningPage).componentInstance;
  p.values.set({ ...p.values(), gross: 600, tare: 210, reserve: 12, job: 60 });
  p.applyOffer();
  expect(p.values()['job']).toBe(60);
  p.compatibilityConfirmed.set(true);
  p.applyOffer();
  expect(p.values()['job']).toBe(160);
  expect(p.values()['gross']).toBe(600);
  expect(p.values()['tare']).toBe(210);
  expect(p.values()['reserve']).toBe(12);
  expect(p.pending()).toBeNull();
});
it('finish offer replaces duration only after deliberate timing confirmation', () => {
  const s = configure(PlannerKind.Finish);
  s.offer({
    destination: PlanningDestination.Finish,
    value: 7.5,
    basis: 'sequential',
  });
  const p = TestBed.createComponent(PlanningPage).componentInstance;
  p.start.set('2026-10-10T09:30');
  p.zone.set('UTC');
  p.values.set({ ...p.values(), allowance: 90, correction: 1.2 });
  p.applyOffer();
  expect(p.pending()).not.toBeNull();
  p.timingConfirmed.set(true);
  p.applyOffer();
  expect(p.values()['hours']).toBe(7);
  expect(p.values()['minutes']).toBe(30);
  expect(p.values()['allowance']).toBe(90);
  expect(p.values()['correction']).toBe(1.2);
  expect(p.start()).toBe('2026-10-10T09:30');
  expect(p.zone()).toBe('UTC');
});
it('adds unsliced layout count without overwriting job and disables totals until completed', () => {
  const s = configure();
  s.jobDraft = workedJob();
  s.offer({
    destination: PlanningDestination.Cost,
    value: 4,
    basis: 'confirmed footprints only',
  });
  let fixture = TestBed.createComponent(JobCostEditor);
  let p = fixture.componentInstance;
  expect(p.input().plates).toHaveLength(2);
  expect(s.hasOffer(PlanningDestination.Cost)).toBe(true);
  fixture.destroy();
  fixture = TestBed.createComponent(JobCostEditor);
  p = fixture.componentInstance;
  expect(p.pending()?.value).toBe(4);
  p.applyLayout();
  expect(s.hasOffer(PlanningDestination.Cost)).toBe(false);
  expect(p.input().plates).toHaveLength(3);
  expect(p.input().plates[2]!.unitsPerRun).toBe(4);
  expect(Number.isNaN(p.input().plates[2]!.hours)).toBe(true);
  expect(Number.isNaN(p.input().plates[2]!.materials[0]!.grams)).toBe(true);
  expect(p.result()).toBeNull();
  p.removePlate(2);
  expect(p.result()?.total).toBe(39.192);
  p.addMaterial(0);
  expect(p.result()).toBeNull();
  p.removeMaterial(0, 1);
  fixture.detectChanges();
  expect(
    fixture.nativeElement.querySelector('.print-record').textContent,
  ).toContain('Total production cost: 39.192');
  expect(fixture.nativeElement.textContent).toContain('Allocated average');
});
it('offers only selected compatible material grams, never financial failure uplift', async () => {
  const s = configure();
  const p = TestBed.createComponent(JobCostEditor).componentInstance;
  p.example();
  p.set('failurePercent', 10);
  p.selectedScope.set('Same filament / spool scope');
  vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  await p.sendMaterial();
  expect(s.take(PlanningDestination.Spool)).toBeNull();
  p.compatible.set(true);
  await p.sendMaterial();
  expect(s.take(PlanningDestination.Spool)?.value).toBe(160);
  p.sequentialConfirmed.set(true);
  await p.sendDuration();
  expect(s.take(PlanningDestination.Finish)?.value).toBe(7);
});
it('exposes usable copy fallbacks when clipboard access fails', async () => {
  configure();
  vi.stubGlobal('navigator', {
    clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
  });
  const job = TestBed.createComponent(JobCostEditor);
  job.componentInstance.example();
  await job.componentInstance.copy();
  job.detectChanges();
  expect(job.nativeElement.querySelector('textarea').value).toContain(
    'Total production cost: 39.192',
  );
  const price = TestBed.createComponent(PrintPricePage);
  await price.componentInstance.copyQuote();
  price.detectChanges();
  expect(price.nativeElement.querySelector('textarea').value).toContain(
    'Order estimate',
  );
});

it('returns keyboard focus to the surviving add control after removing a plate', async () => {
  const s = configure();
  s.jobDraft = workedJob();
  const fixture = TestBed.createComponent(JobCostEditor);
  fixture.detectChanges();
  fixture.componentInstance.addPlate();
  fixture.detectChanges();
  fixture.componentInstance.removePlate(2);
  fixture.detectChanges();
  const add = fixture.nativeElement.querySelector(
    '.add-plate',
  ) as HTMLButtonElement;
  expect(add).not.toBeNull();
  const focus = vi.spyOn(add, 'focus');
  await vi.waitFor(() => expect(focus).toHaveBeenCalled());
});

it('shows the selected calculation basis and pricing method on first render', () => {
  const s = configure();
  s.jobDraft = workedJob();
  const job = TestBed.createComponent(JobCostEditor);
  job.detectChanges();
  const selects = Array.from(
    job.nativeElement.querySelectorAll('select'),
  ) as HTMLSelectElement[];
  expect(
    selects
      .filter((el) =>
        el.closest('label')?.textContent?.includes('Consumption basis'),
      )
      .every((el) => el.value === 'complete-slicer-total'),
  ).toBe(true);
  const price = TestBed.createComponent(PrintPricePage);
  price.detectChanges();
  const methods = Array.from(
    price.nativeElement.querySelectorAll('select'),
  ) as HTMLSelectElement[];
  expect(
    methods.find((el) =>
      el.closest('label')?.textContent?.includes('Pricing method'),
    )?.value,
  ).toBe('margin');
});

it('adds one reviewed sliced plate after confirmation without changing existing job scope or repeats', () => {
  const session = configure();
  session.jobDraft = workedJob();
  session.offer({
    destination: PlanningDestination.Cost,
    value: 1.5,
    basis: 'Declared single run, edited duration, line 3',
    sliced: { hours: 1.5, grams: 12.5 },
  });
  const page = TestBed.createComponent(JobCostEditor).componentInstance;
  const before = structuredClone(page.input());
  page.applySliced();
  expect(page.input()).toEqual(before);
  page.slicedConfirmed.set(true);
  page.applySliced();
  expect(page.input().plates.slice(0, before.plates.length)).toEqual(
    before.plates,
  );
  expect(page.input().requestedQuantity).toBe(before.requestedQuantity);
  const added = page.input().plates.at(-1)!;
  expect(added.hours).toBe(1.5);
  expect(added.materials[0].grams).toBe(12.5);
  expect(added.repeats).toBe(1);
  expect(added.unitsPerRun).toBe(1);
  expect(added.source).toContain('line 3');
  expect(page.pending()).toBeNull();
});
