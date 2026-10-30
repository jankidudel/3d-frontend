import { describe, it, expect } from 'vitest';
import {
  scoreMaterial,
  UseCase,
  productConstraints,
  HardwareEvidence,
  parseMaterialPair,
  MaterialSelectorPage,
  MaterialComparisonPage,
} from './material-tools';
import { printers } from '../printer-comparison/printer-catalogue';
import { TestBed } from '@angular/core/testing';
import {
  provideRouter,
  ActivatedRoute,
  convertToParamMap,
} from '@angular/router';
import { of } from 'rxjs';
import { SeoService } from '../../core/seo/seo.service';
import { materials, MaterialId } from './material-catalogue';
describe('material selector requirement scenarios', () => {
  it('separates flexible bumper candidates from rigid families', () => {
    const tpu = materials.find((material) => material.id === MaterialId.Tpu)!;
    const pla = materials.find((material) => material.id === MaterialId.Pla)!;
    expect(scoreMaterial(tpu, UseCase.Flexible, false).blockers).toHaveLength(
      0,
    );
    expect(scoreMaterial(pla, UseCase.Flexible, false).blockers).toHaveLength(
      1,
    );
    expect(scoreMaterial(tpu, UseCase.Flexible, false).total).toBeGreaterThan(
      scoreMaterial(pla, UseCase.Flexible, false).total,
    );
  });
  it('keeps family enclosure advice as a preparation caution rather than universal exclusion', () => {
    const asa = materials.find((material) => material.id === MaterialId.Asa)!;
    expect(scoreMaterial(asa, UseCase.Outdoor, false).blockers).toHaveLength(0);
    expect(
      scoreMaterial(asa, UseCase.Outdoor, false).tradeoffs.join(' '),
    ).toMatch(/Verify the selected product/);
    expect(scoreMaterial(asa, UseCase.Outdoor, true).blockers).toHaveLength(0);
  });
});

describe('material tool evidence and URL states', () => {
  it('keeps a documented product mismatch visible regardless of editorial ranking', () => {
    const abs = materials.find((material) => material.id === MaterialId.Abs)!;
    const a1 = printers.find((printer) => printer.id === 'bambu-lab-a1')!;
    expect(
      productConstraints(
        abs.productExample,
        a1,
        false,
        HardwareEvidence.Unknown,
      ).constraints,
    ).toHaveLength(1);
    expect(
      productConstraints(undefined, undefined, false, HardwareEvidence.Unknown)
        .constraints,
    ).toHaveLength(0);
    expect(
      productConstraints(
        abs.productExample,
        undefined,
        false,
        HardwareEvidence.Unknown,
      ).unknowns.join(' '),
    ).toMatch(/chamber conditions/);
    TestBed.configureTestingModule({
      imports: [MaterialSelectorPage],
      providers: [
        provideRouter([]),
        { provide: SeoService, useValue: { apply: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(MaterialSelectorPage);
    const page = fixture.componentInstance;
    page.productId.set(abs.id);
    page.printerId.set(a1.id);
    page.useCase.set(UseCase.Heat);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Documented product constraint:',
    );
    expect(page.ranked().some((score) => score.material.id === abs.id)).toBe(
      false,
    );
    page.useCase.set(UseCase.Flexible);
    expect(page.ranked().map((score) => score.material.id)).toEqual([
      MaterialId.Tpu,
    ]);
  });
  it('does not turn no selected printer or unknown hardware into a pass', () => {
    const pp = materials.find((material) => material.id === MaterialId.Pp)!;
    expect(
      productConstraints(
        pp.productExample,
        undefined,
        false,
        HardwareEvidence.Unknown,
      ).unknowns.join(' '),
    ).toMatch(/nozzle wear resistance.*unknown/);
    expect(
      productConstraints(
        pp.productExample,
        undefined,
        false,
        HardwareEvidence.Absent,
      ).constraints,
    ).toHaveLength(1);
    expect(
      scoreMaterial(pp, UseCase.Outdoor, false).unknowns.join(' '),
    ).toMatch(/no lifespan/);
  });
  it('selects alias IDs deterministically and blocks output for unknown query IDs', () => {
    expect(parseMaterialPair('pa-nylon', 'pc')).toEqual({
      left: MaterialId.Nylon,
      right: MaterialId.Pc,
    });
    expect(parseMaterialPair(null, null)).toEqual({
      left: MaterialId.Pla,
      right: MaterialId.Petg,
    });
    expect(parseMaterialPair('nylon', 'unknown')).toEqual({
      left: '',
      right: '',
    });
    TestBed.configureTestingModule({
      imports: [MaterialComparisonPage],
      providers: [
        provideRouter([]),
        { provide: SeoService, useValue: { apply: () => undefined } },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(
              convertToParamMap({ left: 'unknown', right: MaterialId.Petg }),
            ),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(MaterialComparisonPage);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
    expect(element.querySelector('app-material-product-comparison')).toBeNull();
  });
});
