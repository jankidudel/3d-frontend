import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { JobsService } from '../../core/api/jobs.service';
import { StlJobService } from '../../core/api/stl-job.service';
import { SeoService } from '../../core/seo/seo.service';
import { Job, JobStatus } from '../../models/job';
import { MeshQualityPdfService } from '../../shared/mesh-quality-pdf.service';
import { StlSplitterPage } from './stl-splitter-page';

describe('StlSplitterPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StlSplitterPage],
      providers: [
        provideRouter([]),
        { provide: AnalyticsService, useValue: { trackSplitter: vi.fn() } },
        { provide: JobsService, useValue: { getJob: vi.fn() } },
        { provide: StlJobService, useValue: { create: vi.fn() } },
        { provide: MeshQualityPdfService, useValue: { download: vi.fn() } },
        { provide: SeoService, useValue: { apply: vi.fn() } },
      ],
    });
  });

  it('groups successful split report downloads in the shared report-actions layout', () => {
    const fixture = TestBed.createComponent(StlSplitterPage);
    fixture.componentInstance['job'].set(completedSplitJob());
    fixture.detectChanges();

    const actions = fixture.nativeElement.querySelector('.report-actions');
    expect(actions).not.toBeNull();
    expect(actions.tagName).toBe('DIV');
    expect(actions.querySelectorAll('.button')).toHaveLength(2);
  });
});

function completedSplitJob(): Job {
  return {
    id: 'split-job',
    fileName: 'model.stl',
    fileSizeBytes: 1,
    status: JobStatus.Completed,
    createdAt: '2026-09-05T00:00:00Z',
    report: {
      split: {
        axis: 'Z',
        positionPercent: 50,
        partA: part('model-part-a.stl'),
        partB: part('model-part-b.stl'),
      },
    } as never,
  };
}

function part(fileName: string) {
  return {
    fileName,
    triangleCount: 4,
    dimensions: { width: 1, height: 1, depth: 1 },
  };
}
