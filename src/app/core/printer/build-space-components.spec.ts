import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import {
  PrinterProfileService,
  PRINTER_PROFILE_STORAGE_KEY,
  BedShape,
} from './printer-profile.service';
import { PrinterFitControls } from '../../shared/printer-fit-controls';
import { PrinterProfileEditor } from '../../shared/printer-profile-editor';
import {
  PrinterFitPage,
  PrinterFitOrientationMode,
} from '../../features/printer-fit/printer-fit-page';
import { OrientationPlannerPage } from '../../features/orientation-planner/orientation-planner-page';
import { BedLayoutPlannerPage } from '../../features/bed-layout-planner/bed-layout-planner-page';
import { StlDimensionsPage } from '../../features/stl-dimensions/stl-dimensions-page';
import { ThreeMfDimensionsPage } from '../../features/three-mf/threemf-dimensions-page';
import { StlPrintPreflightPage } from '../../features/stl-print-preflight/stl-print-preflight-page';
import { ThreeMfPrintPreflightPage } from '../../features/three-mf-print-preflight/three-mf-print-preflight-page';
import { GcodePreflightPage } from '../../features/gcode-preflight/gcode-preflight-page';
import {
  JobPlanningSession,
  PlanningDestination,
} from '../../features/planning/job-planning-session';
import { EnvelopeState } from './build-space';
const mesh = {
  positions: new Float32Array([0, 0, 0, 200, 0, 0, 0, 170, 0, 0, 0, 240]),
  indices: new Uint32Array([0, 1, 2, 0, 3, 1]),
};
describe('printer profile through actual components', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideRouter([])],
    });
  });
  afterEach(() => localStorage.clear());
  function editor() {
    const controls = new PrinterFitControls(
      TestBed.inject(PrinterProfileService),
    );
    const fixture = TestBed.createComponent(PrinterProfileEditor);
    fixture.componentRef.setInput('controls', controls);
    fixture.detectChanges();
    return { controls, fixture };
  }
  function choosePreset(fixture: ReturnType<typeof editor>['fixture']) {
    const select = fixture.nativeElement.querySelector(
      'select',
    ) as HTMLSelectElement;
    select.value = '1';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }
  function confirm(fixture: ReturnType<typeof editor>['fixture']) {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    buttons.find((b) => b.textContent?.includes('Confirm axes'))!.click();
    fixture.detectChanges();
  }
  it('keeps an invalid profile unsaved and focuses the first missing dimension', () => {
    const { fixture } = editor();
    confirm(fixture);
    expect(TestBed.inject(PrinterProfileService).profile()).toBeNull();
    expect(document.activeElement?.getAttribute('type')).toBe('number');
    expect(fixture.nativeElement.textContent).toContain(
      'positive finite dimensions',
    );
  });
  it('maps the actual typical preset and saved form consistently across every consumer', () => {
    const { fixture } = editor();
    choosePreset(fixture);
    confirm(fixture);
    expect(TestBed.inject(PrinterProfileService).profile()).toMatchObject({
      x: 220,
      y: 220,
      z: 250,
    });
    const fit = TestBed.createComponent(PrinterFitPage).componentInstance;
    expect(fit.buildVolume()).toEqual({ width: 220, height: 220, depth: 250 });
    const layout =
      TestBed.createComponent(BedLayoutPlannerPage).componentInstance;
    expect(layout.bed()).toMatchObject({ x: 220, y: 220, z: 250, unit: 'mm' });
    const orientation = TestBed.createComponent(
      OrientationPlannerPage,
    ).componentInstance;
    orientation.mesh.set(mesh);
    expect(orientation.plans()[0].fit?.state).toBe(EnvelopeState.Contained);
    const stl = TestBed.createComponent(StlDimensionsPage).componentInstance;
    expect(stl.buildVolume()).toEqual({ width: 220, height: 220, depth: 250 });
    const mf = TestBed.createComponent(ThreeMfDimensionsPage).componentInstance;
    expect(mf['buildVolume']()).toEqual({
      width: 220,
      height: 220,
      depth: 250,
    });
    const preflight = TestBed.createComponent(
      StlPrintPreflightPage,
    ).componentInstance;
    preflight.dimensionsReport.set({ width: 200, height: 170, depth: 240 });
    expect(preflight.orientation()?.current.fit.fits).toBe(true);
    const mfPreflight = TestBed.createComponent(
      ThreeMfPrintPreflightPage,
    ).componentInstance;
    expect(mfPreflight.buildVolume()).toEqual({
      width: 220,
      height: 220,
      depth: 250,
    });
    const gcode = TestBed.createComponent(GcodePreflightPage).componentInstance;
    expect(gcode.printerProfile()).toMatchObject({ x: 220, y: 220, z: 250 });
  });
  it('requires legacy axis review without populating an assumed mapping, then honours asymmetric Y', () => {
    const raw = '{"width":220,"height":250,"depth":180,"unit":"mm"}';
    localStorage.setItem(PRINTER_PROFILE_STORAGE_KEY, raw);
    const { controls, fixture } = editor();
    expect(controls.draft()).toBeNull();
    expect(controls.buildWidth()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Height 250');
    const inputs = Array.from(
      fixture.nativeElement.querySelectorAll('input'),
    ) as HTMLInputElement[];
    [220, 180, 250].forEach((n, i) => {
      inputs[i].value = String(n);
      inputs[i].dispatchEvent(new Event('input'));
    });
    expect(TestBed.inject(PrinterProfileService).profile()).toBeNull();
    confirm(fixture);
    expect(localStorage.getItem(PRINTER_PROFILE_STORAGE_KEY)).toBe(raw);
    const fit = TestBed.createComponent(PrinterFitPage).componentInstance;
    fit.dimensions.set({ width: 200, height: 170, depth: 240 });
    fit.orientationMode.set(PrinterFitOrientationMode.Current);
    expect(fit.assessment()?.verdict).toBe(EnvelopeState.Contained);
    fit.dimensions.set({ width: 200, height: 190, depth: 240 });
    expect(fit.assessment()?.verdict).toBe(EnvelopeState.Outside);
    const layout =
      TestBed.createComponent(BedLayoutPlannerPage).componentInstance;
    expect(layout.bed()).toMatchObject({ x: 220, y: 180, z: 250 });
  });
  it('uses circular fit and explicitly leaves dimensions-only shape coverage unassessed', () => {
    const { controls, fixture } = editor();
    choosePreset(fixture);
    controls.shape.set(BedShape.Circular);
    controls.diameter.set(220);
    confirm(fixture);
    const fit = TestBed.createComponent(PrinterFitPage).componentInstance;
    fit.dimensions.set({ width: 150, height: 150, depth: 200 });
    fit.orientationMode.set(PrinterFitOrientationMode.Current);
    expect(fit.assessment()?.verdict).toBe(EnvelopeState.Contained);
    fit.margin.set(5);
    expect(fit.assessment()?.verdict).toBe(EnvelopeState.Outside);
    fit.margin.set(110);
    expect(fit.assessment()).toBeNull();
    expect(
      TestBed.createComponent(
        StlDimensionsPage,
      ).componentInstance.buildVolume(),
    ).toBeNull();
    expect(
      TestBed.createComponent(ThreeMfDimensionsPage).componentInstance[
        'buildVolume'
      ](),
    ).toBeNull();
  });
  it('converts saved units, requires explicit session override and reveals editable inputs after clearing', () => {
    const { controls, fixture } = editor();
    controls.buildWidth.set(22);
    controls.buildHeight.set(18);
    controls.buildDepth.set(25);
    controls.buildUnit.set('cm');
    confirm(fixture);
    const page =
      TestBed.createComponent(BedLayoutPlannerPage).componentInstance;
    expect(page.bed()).toMatchObject({ x: 220, y: 180, z: 250 });
    page.printerControls.buildWidth.set(10);
    expect(page.bed()?.x).toBe(220);
    page.useSaved.set(false);
    expect(page.bed()?.x).toBe(100);
    page.printerControls.clear();
    expect(page.profile()).toBeNull();
    expect(page.bed()).toBeNull();
    page.printerControls.buildWidth.set(8);
    page.printerControls.buildHeight.set(7);
    page.printerControls.buildDepth.set(9);
    page.printerControls.buildUnit.set('in');
    expect(page.bed()?.x).toBeCloseTo(203.2);
    expect(page.bed()?.y).toBeCloseTo(177.8);
  });
  it('invalidates confirmed count after every relevant setting and offers only accepted placements', async () => {
    const page =
      TestBed.createComponent(BedLayoutPlannerPage).componentInstance;
    page.parts.set([
      { name: 'accepted', width: 40, depth: 40, z: 20 },
      { name: 'unplaced', width: 400, depth: 400, z: 20 },
    ]);
    expect(page.plan().placed).toHaveLength(1);
    const changes = [
      () => page.margin.set(6),
      () => page.gap.set(6),
      () => page.expansion.set(1),
      () => page.stlUnit.set('cm'),
      () => page.printerControls.shape.set(BedShape.Circular),
      () => page.printerControls.diameter.set(220),
      () => page.printerControls.buildUnit.set('in'),
      () => page.parts.set([]),
      () => page.useSaved.set(true),
    ];
    for (const change of changes) {
      page.countConfirmed.set(true);
      expect(page.countConfirmed()).toBe(true);
      change();
      expect(page.countConfirmed()).toBe(false);
    }
    page.useSaved.set(false);
    page.printerControls.shape.set(BedShape.Rectangular);
    page.printerControls.buildUnit.set('mm');
    page.stlUnit.set('mm');
    page.parts.set([
      { name: 'A', width: 40, depth: 40 },
      { name: 'B', width: 400, depth: 400 },
    ]);
    page.countConfirmed.set(true);
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await page.offerCost();
    expect(
      TestBed.inject(JobPlanningSession).peek(PlanningDestination.Cost)?.value,
    ).toBe(1);
  });
});
