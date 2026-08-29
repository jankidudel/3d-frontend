import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { JobsService } from '../../core/api/jobs.service';
import { JobCreationService } from '../../core/api/job-creation.service';
import { Job } from '../../models/job';
import { ThreeMfDimensionsPage } from './threemf-dimensions-page';

describe('ThreeMfDimensionsPage', () => {
  const completedJob: Job = {
    id: 'three-mf-dimensions-1',
    fileName: 'placed-build.3mf',
    fileSizeBytes: 1024,
    status: 'completed',
    createdAt: '2026-08-20T12:00:00Z',
    report: {
      sourceUnit: 'millimeter',
      // These are the processor's resolved build bounds after transforms.
      dimensions: { width: 10, height: 20, depth: 30 },
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ThreeMfDimensionsPage],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: { getJob: vi.fn() } },
        { provide: JobCreationService, useValue: { create: vi.fn() } },
      ],
    });
  });

  it('uses resolved transformed build bounds for an automatic rotated fit', () => {
    const fixture = TestBed.createComponent(ThreeMfDimensionsPage);
    fixture.componentInstance['job'].set(completedJob);
    fixture.componentInstance['buildWidth'].set(30);
    fixture.componentInstance['buildHeight'].set(20);
    fixture.componentInstance['buildDepth'].set(10);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('10 × 20 × 30');
    expect(text).toContain('Fits after a 90° rotation');
    expect(text).toContain('30 × 20 × 10');
  });

  it('states when no checked rotation fits', () => {
    const fixture = TestBed.createComponent(ThreeMfDimensionsPage);
    fixture.componentInstance['job'].set(completedJob);
    fixture.componentInstance['buildWidth'].set(9);
    fixture.componentInstance['buildHeight'].set(19);
    fixture.componentInstance['buildDepth'].set(29);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No checked 90° orientation fits this volume',
    );
  });
});
