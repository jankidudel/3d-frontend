import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  ActivatedRoute,
  convertToParamMap,
} from '@angular/router';
import { of } from 'rxjs';
import { SeoService } from '../../core/seo/seo.service';
import { FilamentLengthCalculatorPage } from './filament-length-calculator-page';
import { describe, expect, it } from 'vitest';
import { volumetricPlan } from '../planning/planning-calculations';
import {
  DensityOrigin,
  editDensity,
  initialDensityState,
  selectDensityPreset,
  resolveDensityPreset,
  FILAMENT_DIAMETERS,
  gramsToMetres,
  metresToGrams,
} from './filament-length-calculator';

describe('filament length calculator', () => {
  it('converts PLA weight to a 1.75 mm filament length', () => {
    expect(gramsToMetres(1000, 1.75, 1.24)).toBeCloseTo(335.28, 2);
  });

  it('converts a filament length back to weight', () => {
    const length = gramsToMetres(1000, 1.75, 1.24);
    expect(length).not.toBeNull();
    expect(metresToGrams(length ?? 0, 1.75, 1.24)).toBeCloseTo(1000, 6);
  });

  it('rejects incomplete or impossible values', () => {
    expect(gramsToMetres(0, 1.75, 1.24)).toBeNull();
    expect(metresToGrams(10, -1.75, 1.24)).toBeNull();
  });
});

describe('independent cylinder conversion and density provenance', () => {
  it('agrees in both directions at both supported diameters within 0.000001', () => {
    for (const diameter of FILAMENT_DIAMETERS) {
      const volumeMm3 = (1000 / 1.24) * 1000;
      const expectedMetres = volumeMm3 / (Math.PI * (diameter / 2) ** 2) / 1000;
      expect(
        Math.abs(gramsToMetres(1000, diameter, 1.24)! - expectedMetres),
      ).toBeLessThan(0.000001);
      const expectedGrams =
        ((100 * 1000 * Math.PI * (diameter / 2) ** 2) / 1000) * 1.24;
      expect(
        Math.abs(metresToGrams(100, diameter, 1.24)! - expectedGrams),
      ).toBeLessThan(0.000001);
    }
    const requested = volumetricPlan(0.45, 0.2, 100, null)!;
    expect(requested.flow).toBeCloseTo(9, 10);
    expect(requested.speedAtLimit).toBeNull();
    expect(requested.exceeds).toBeNull();
    expect(volumetricPlan(0.45, 0.2, 200, null)!.flow).toBeCloseTo(18, 10);
  });
  it('keeps published density distinct from edited values and preserves user input across preset changes', () => {
    const product = initialDensityState(null, 'pp');
    expect(product.origin).toBe(DensityOrigin.Product);
    expect(product.value).toBe(0.91);
    const edited = editDensity(product, 0.97);
    expect(edited.origin).toBe(DensityOrigin.User);
    expect(edited.productId).toBeUndefined();
    expect(selectDensityPreset(edited, 'Pla').value).toBe(0.97);
    expect(selectDensityPreset(edited, 'Pla').origin).toBe(DensityOrigin.User);
    expect(initialDensityState('Pla', null).origin).toBe(DensityOrigin.Family);
    expect(initialDensityState('unknown', null).notice).toMatch(
      /Unknown material/,
    );
    expect(initialDensityState(null, 'unknown').notice).toMatch(
      /Unknown product/,
    );
    for (const id of ['Nylon', 'pa-nylon', 'nylon']) {
      expect(resolveDensityPreset(id)).toBe('Nylon');
    }
  });
});

describe('density controls and displayed conversion', () => {
  it('updates provenance through real input events and retains edited density through family selection', () => {
    TestBed.configureTestingModule({
      imports: [FilamentLengthCalculatorPage],
      providers: [
        provideRouter([]),
        { provide: SeoService, useValue: { apply: () => undefined } },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({ grade: 'pp' })) },
        },
      ],
    });
    const fixture = TestBed.createComponent(FilamentLengthCalculatorPage);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const density = Array.from(root.querySelectorAll('label'))
      .find((label) => label.textContent?.includes('Material density'))!
      .querySelector('input')!;
    const calculator = root.querySelector('.calculator')!;
    expect(density.value).toBe('0.91');
    expect(calculator.textContent).toContain('Published product density');
    expect(calculator.querySelector('a[href^="https://"]')).not.toBeNull();
    density.value = '0.97';
    density.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(calculator.textContent).toContain('User-entered density');
    expect(calculator.querySelector('a[href^="https://"]')).toBeNull();
    const selects = root.querySelectorAll('select');
    selects[1].value = 'Pla';
    selects[1].dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(density.value).toBe('0.97');
    density.value = '1.24';
    density.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    for (const diameter of FILAMENT_DIAMETERS) {
      selects[0].value = String(diameter);
      selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
      const shown = Number(
        root
          .querySelector('.result-value')!
          .textContent!.replaceAll(',', '')
          .match(/[\d.]+/)![0],
      );
      const independentlyCalculated =
        1000 / (1.24 * Math.PI * (diameter / 2) ** 2);
      expect(Math.abs(shown - independentlyCalculated)).toBeLessThan(0.051);
    }
    (
      root.querySelectorAll('input[type="radio"]')[1] as HTMLInputElement
    ).click();
    fixture.detectChanges();
    for (const diameter of FILAMENT_DIAMETERS) {
      selects[0].value = String(diameter);
      selects[0].dispatchEvent(new Event('change', { bubbles: true }));
      fixture.detectChanges();
      const shown = Number(
        root
          .querySelector('.result-value')!
          .textContent!.replaceAll(',', '')
          .match(/[\d.]+/)![0],
      );
      const independentlyCalculated =
        100 * 1.24 * Math.PI * (diameter / 2) ** 2;
      expect(Math.abs(shown - independentlyCalculated)).toBeLessThan(0.051);
    }
  });
});
