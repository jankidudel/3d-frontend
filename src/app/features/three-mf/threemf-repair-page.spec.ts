import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { SeoService } from '../../core/seo/seo.service';
import type { ThreeMfRepairResult } from './three-mf-local-repair';
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
      'No supported removal is selected. Other mesh problems may remain.',
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
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('copies only a deliberate completed summary and reports clipboard failure', async () => {
    const fixture = TestBed.createComponent(ThreeMfRepairPage);
    const page = fixture.componentInstance;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    await page.copySummary();
    expect(writeText).not.toHaveBeenCalled();
    page.file.set(new File(['private geometry'], 'private-customer-name.3mf'));
    page.result.set(repairedResult());
    fixture.detectChanges();
    expect(writeText).not.toHaveBeenCalled();
    (
      fixture.nativeElement.querySelectorAll(
        'button',
      ) as NodeListOf<HTMLButtonElement>
    ).forEach((button) => {
      if (button.textContent?.includes('Copy repair summary')) {
        button.click();
      }
    });
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledTimes(1);
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('duplicate 1');
    expect(text).toContain('No physical print was verified');
    expect(text).not.toContain('private-customer-name');
    expect(text).not.toContain('private geometry');
    expect(page.summaryFeedback()).toContain('copied');
    writeText.mockRejectedValue(new Error('denied'));
    await page.copySummary();
    expect(page.summaryFeedback()).toContain('Could not copy');
    expect(page.copyingSummary()).toBe(false);
  });

  it('clears exports after a plan change and never retains a download after failed export', async () => {
    const page = TestBed.createComponent(ThreeMfRepairPage).componentInstance;
    page.analysis.set(analysis({ duplicateTriangles: 1 }));
    page.result.set(repairedResult());
    page.setPlan('removeDuplicateTriangles', true);
    expect(page.result()).toBeNull();
    expect(page.canRepair()).toBe(true);
    // This deliberately invalid source cannot be exported as a package.
    page.result.set(repairedResult());
    await page.repair();
    expect(page.result()).toBeNull();
    expect(page.error()).toContain('No repaired copy was created');
    expect(page.loading()).toBe(false);
  });

  it('ignores stale file reads after clearing a selection', async () => {
    const page = TestBed.createComponent(ThreeMfRepairPage).componentInstance;
    let rejectRead!: (reason: Error) => void;
    const file = new File(['not a package'], 'pending.3mf');
    vi.spyOn(file, 'arrayBuffer').mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRead = reject;
      }),
    );
    const pending = page.onFileSelected(file);
    await page.onFileSelected(null);
    rejectRead(new Error('stale read'));
    await pending;
    expect(page.analysis()).toBeNull();
    expect(page.result()).toBeNull();
    expect(page.error()).toBe('');
    expect(page.loading()).toBe(false);
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

function repairedResult(): ThreeMfRepairResult {
  return {
    bytes: new Uint8Array(),
    before: analysis({ triangles: 13, duplicateTriangles: 1 }),
    after: analysis({ triangles: 12 }),
    applied: {
      duplicateTriangles: 1,
      degenerateTriangles: 0,
      invalidIndexTriangles: 0,
    },
  };
}
