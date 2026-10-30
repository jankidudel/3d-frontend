import {
  materialProfilePaths,
  materialPairPaths,
  PublicRoutePathValue,
  PublicRouteSegment,
} from '../../core/seo/public-routes';
import { materialComparisons } from './material-comparisons';
import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  MaterialDetailPage,
  MaterialComparisonDetailPage,
} from './material-pages';
import { SeoService } from '../../core/seo/seo.service';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { materials, materialSources, MaterialId } from './material-catalogue';
import {
  claimValue,
  compareClaims,
  ComparisonOutcome,
  EvidenceAvailability,
  EvidenceScope,
  MaterialProperty,
  normalizeEvidenceValue,
  productClaimLabel,
  validateMaterialEvidence,
  type MaterialEvidenceClaim,
} from './material-evidence';
import {
  MaterialEvidenceComponent,
  MaterialProductComparisonComponent,
  materialEvidenceUrl,
} from './material-evidence-components';

const density = materials[0].productExample!.claims.find(
  (claim) => claim.property === MaterialProperty.Density,
)!;
const complete: MaterialEvidenceClaim = {
  ...density,
  method: 'ISO 1183',
  specimen: 'Controlled filament specimen',
  conditioning: '48 hours at 23 °C, 50% RH',
  testTemperature: '23 °C',
};
describe('published material evidence boundaries', () => {
  it('validates every published claim against the existing sources without requiring invented methods', () => {
    expect(
      validateMaterialEvidence(materials, materialSources, '2026-10-29'),
    ).toEqual([]);
    expect(
      materials.filter((material) => material.productExample),
    ).toHaveLength(8);
    expect(
      claimValue({
        ...density,
        value: undefined,
        availability: EvidenceAvailability.NotSpecified,
      }),
    ).toBe('not specified');
    expect(claimValue({ ...density, value: 0 })).toBe('0 g/cm³');
  });
  it('requires named identity and renders it alongside numeric claims', () => {
    const example = materials[0].productExample!;
    expect(() =>
      productClaimLabel({ ...example, productName: '' }, density),
    ).toThrow(/identity/);
    TestBed.configureTestingModule({
      imports: [MaterialEvidenceComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(MaterialEvidenceComponent);
    fixture.componentRef.setInput('material', materials[0]);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain(example.productName);
    expect(element.textContent).toContain('1.24 g/cm³');
    expect(element.querySelector('#product-evidence')).not.toBeNull();
    expect(element.querySelectorAll('a[href^="https://"]')).not.toHaveLength(0);
  });
  it('only compares equivalent quantities with complete matching conditions', () => {
    expect(
      compareClaims(complete, { ...complete, value: 1240, unit: 'kg/m³' })
        .outcome,
    ).toBe(ComparisonOutcome.Comparable);
    expect(normalizeEvidenceValue(1.5, 'GPa', 'MPa')).toBe(1500);
    expect(normalizeEvidenceValue(95, 'Shore A', 'Shore D')).toBeNull();
    expect(normalizeEvidenceValue(68, '°C', 'MPa')).toBeNull();
    for (const changed of [
      { method: 'Other test' },
      { conditioning: 'Wet' },
      { specimen: undefined },
      { testTemperature: undefined },
      { property: MaterialProperty.Hdt, unit: '°C' },
    ]) {
      expect(compareClaims(complete, { ...complete, ...changed }).outcome).toBe(
        ComparisonOutcome.Separate,
      );
    }
    const hdt = {
      ...complete,
      property: MaterialProperty.Hdt,
      unit: '°C',
      orientation: 'Horizontal',
      testLoad: '1.80 MPa',
    };
    expect(compareClaims(hdt, { ...hdt, testLoad: '0.45 MPa' }).outcome).toBe(
      ComparisonOutcome.Separate,
    );
    expect(compareClaims(hdt, { ...hdt, orientation: undefined }).outcome).toBe(
      ComparisonOutcome.Separate,
    );
    expect(
      compareClaims(hdt, {
        ...hdt,
        availability: EvidenceAvailability.NotApplicable,
        value: undefined,
      }).outcome,
    ).toBe(ComparisonOutcome.Unavailable);
  });
  it('keeps actual hardness scales and PA identities and never renders a missing modulus as zero', () => {
    const tpu = materials.find((material) => material.id === MaterialId.Tpu)!;
    const nylon = materials.find(
      (material) => material.id === MaterialId.Nylon,
    )!;
    expect(nylon.productExample!.formulation).toContain(
      'Polyamide 11, unfilled',
    );
    const a = tpu.productExample!.claims.find(
      (claim) => claim.property === MaterialProperty.HardnessA,
    )!;
    const d = tpu.productExample!.claims.find(
      (claim) => claim.property === MaterialProperty.HardnessD,
    )!;
    expect(compareClaims(a, d).outcome).toBe(ComparisonOutcome.Separate);
    TestBed.configureTestingModule({
      imports: [MaterialProductComparisonComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(MaterialProductComparisonComponent);
    fixture.componentRef.setInput('left', materials[0]);
    fixture.componentRef.setInput('right', tpu);
    fixture.detectChanges();
    const rows = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr'),
    );
    const modulus = rows.find((row) =>
      row.textContent?.includes(MaterialProperty.Modulus),
    )!;
    expect(modulus.textContent).toContain(
      'Not found in this example; not zero.',
    );
    expect(modulus.textContent).not.toContain('0 GPa');
    expect(materialEvidenceUrl(nylon)).toBe(
      '/materials/nylon#product-evidence',
    );
  });
  it('provides useful deterministic diagnostics without querying manufacturer availability', () => {
    const bad = {
      ...density,
      sourceId: 'missing-source',
      range: { min: 5, max: 2 },
      unit: 'unsupported-unit',
      value: undefined,
    };
    const errors = validateMaterialEvidence(
      [
        {
          id: 'sample',
          productExample: { ...materials[0].productExample!, claims: [bad] },
        },
      ],
      [{ id: 'future', url: 'https://example.com', accessedAt: '2099-01-01' }],
      '2026-10-29',
    );
    expect(errors.join('\n')).toMatch(/missing source ID/);
    expect(errors.join('\n')).toMatch(/future access date/);
    expect(errors.join('\n')).toMatch(/invalid range/);
    expect(errors.join('\n')).toMatch(/unsupported unit/);
    expect(
      validateMaterialEvidence(
        [
          {
            id: 'family',
            productExample: {
              ...materials[0].productExample!,
              claims: [{ ...density, scope: EvidenceScope.Family }],
            },
          },
        ],
        materialSources,
        '2026-10-29',
      ).join('\n'),
    ).toMatch(/family guidance/i);
  });
});

it('opens profile evidence deep links and pair query URLs without treating fragments as a material slug', async () => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'materials/nylon', component: MaterialDetailPage },
        {
          path: 'compare-materials/nylon-vs-polycarbonate',
          component: MaterialComparisonDetailPage,
        },
      ]),
      { provide: SeoService, useValue: { apply: () => undefined } },
    ],
  });
  const harness = await RouterTestingHarness.create(
    '/materials/nylon?from=guide#product-evidence',
  );
  expect(harness.routeNativeElement?.textContent).toContain('Prusament PA11');
  expect(
    harness.routeNativeElement?.querySelectorAll('#product-evidence'),
  ).toHaveLength(1);
  await harness.navigateByUrl(
    '/compare-materials/nylon-vs-polycarbonate?from=profile#evidence',
  );
  expect(harness.routeNativeElement?.textContent).toContain(
    'Prusament PC Blend',
  );
});

it('keeps lazy route projections aligned with every published material and curated pair', () => {
  expect(new Set(materialProfilePaths)).toEqual(
    new Set(
      materials.map(
        (material) => `${PublicRoutePathValue.Materials}/${material.slug}`,
      ),
    ),
  );
  expect(new Set(materialPairPaths)).toEqual(
    new Set(
      materialComparisons.map(
        (pair) => `${PublicRouteSegment.MaterialComparisons}/${pair.slug}`,
      ),
    ),
  );
});
