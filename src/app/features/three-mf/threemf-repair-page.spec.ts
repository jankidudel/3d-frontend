import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { JobCreationService } from '../../core/api/job-creation.service';
import { JobsService } from '../../core/api/jobs.service';
import { SeoService } from '../../core/seo/seo.service';
import { MeshQualityPdfService } from '../../shared/mesh-quality-pdf.service';
import { Job } from '../../models/job';
import { ThreeMfRepairPage } from './threemf-repair-page';

describe('ThreeMfRepairPage', () => {
  const analytics = { trackThreeMfRepair: vi.fn() };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ThreeMfRepairPage],
      providers: [
        provideRouter([]),
        { provide: AnalyticsService, useValue: analytics },
        { provide: JobCreationService, useValue: { create: vi.fn() } },
        { provide: JobsService, useValue: { getJob: vi.fn() } },
        { provide: MeshQualityPdfService, useValue: { download: vi.fn() } },
        { provide: SeoService, useValue: { apply: vi.fn() } },
      ],
    });
  });

  it.each([
    [
      'shows a success banner without a repaired-file download when no repair is needed',
      repairReport({
        afterValidation: validation(true),
        repair: repairSummary(),
      }),
      'No repairs needed',
      false,
    ],
    [
      'shows a clean repaired result and download action',
      repairReport({
        afterValidation: validation(true),
        repair: repairSummary({ duplicateTrianglesRemoved: 6 }),
      }),
      'Repaired safely',
      true,
    ],
    [
      'shows remaining warnings after repairs',
      repairReport({
        afterValidation: validation(true, [
          {
            code: 'open_edge',
            severity: 'warning',
            count: 2,
            message: '2 open edges remain.',
          },
        ]),
        repair: repairSummary({ orientationFixesApplied: 4 }),
      }),
      'Repaired with remaining warnings',
      true,
    ],
    [
      'shows a manual-repair warning without a repaired-file download',
      repairReport({
        afterValidation: validation(false, [
          {
            code: 'non_manifold_edge',
            severity: 'error',
            count: 1,
            message: 'A non-manifold edge remains.',
          },
        ]),
        repair: repairSummary(),
      }),
      'No safe repairs could be applied',
      false,
    ],
  ])('%s', (_description, report, expectedTitle, expectDownload) => {
    const fixture = TestBed.createComponent(ThreeMfRepairPage);
    fixture.componentInstance['job'].set(completedJob(report));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain(expectedTitle);
    expect(text).toContain('Triangles');
    expect(text).toContain('Degenerate triangles removed');
    expect(text).toContain('Duplicate triangles removed');
    expect(text).toContain('Orientation fixes applied');
    expect(text).toContain('Download JSON report');
    expect(text).toContain('Download PDF report');
    expect(text.includes('Download repaired 3MF')).toBe(expectDownload);
  });

  it('shows invalid-index removals only when they were applied', () => {
    const fixture = TestBed.createComponent(ThreeMfRepairPage);
    fixture.componentInstance['job'].set(
      completedJob(
        repairReport({
          afterValidation: validation(true),
          repair: repairSummary({ invalidIndexTrianglesRemoved: 3 }),
        }),
      ),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Invalid-index triangles removed',
    );
  });
});

function completedJob(report: unknown): Job {
  return {
    id: 'three-mf-repair-1',
    fileName: 'part.3mf',
    fileSizeBytes: 1024,
    status: 'completed',
    createdAt: '2026-09-05T00:00:00Z',
    report,
  } as Job;
}

function repairReport(report: Record<string, unknown>): unknown {
  return report;
}

function repairSummary(overrides: Record<string, number> = {}) {
  return {
    repairedFileAvailable: true,
    trianglesBefore: 2200,
    trianglesAfter: 2194,
    degenerateTrianglesRemoved: 0,
    duplicateTrianglesRemoved: 0,
    invalidIndexTrianglesRemoved: 0,
    orientationFixesApplied: 0,
    ...overrides,
  };
}

function validation(isValid: boolean, issues: unknown[] = []) {
  return { validation: { isValid, issues } };
}
