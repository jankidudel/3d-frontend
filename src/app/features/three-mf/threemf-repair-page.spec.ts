import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import { ThreeMfRepairPage } from './threemf-repair-page';

describe('ThreeMfRepairPage', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ThreeMfRepairPage],
      providers: [
        provideRouter([]),
        {
          provide: AnalyticsService,
          useValue: { trackThreeMfRepair: vi.fn() },
        },
        { provide: SeoService, useValue: { apply: vi.fn() } },
      ],
    }),
  );

  it('explains that unsupported mesh findings are not automatically repaired', () => {
    const fixture = TestBed.createComponent(ThreeMfRepairPage);
    fixture.componentInstance['analysis'].set(analysis({ openEdges: 2 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Issue detected but not safely repairable',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Open edges, non-manifold geometry',
    );
  });

  it('shows only meaningful selected repair actions', () => {
    const fixture = TestBed.createComponent(ThreeMfRepairPage);
    fixture.componentInstance['analysis'].set(
      analysis({ duplicateTriangles: 3, degenerateTriangles: 1 }),
    );
    fixture.componentInstance['plan'].set({
      removeDegenerateTriangles: true,
      removeDuplicateTriangles: true,
      removeInvalidIndexTriangles: false,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'Remove 3 exact duplicate triangles',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Remove 1 degenerate triangles',
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'Remove 0 invalid-index triangles',
    );
  });
});

function analysis(countOverrides: Record<string, number>) {
  return {
    packageInfo: {
      declaredUnit: 'millimeter',
      declaredUnitExplicitly: true,
      buildItemCount: 1,
      modelPartFound: true,
    },
    resolved: { buildItemCount: 1, resolvedMeshCount: 1 },
    counts: {
      triangles: 4,
      degenerateTriangles: 0,
      duplicateTriangles: 0,
      invalidIndexTriangles: 0,
      openEdges: 0,
      nonManifoldEdges: 0,
      inconsistentWindingEdges: 0,
      ...countOverrides,
    },
    source: new Uint8Array(),
  } as never;
}
