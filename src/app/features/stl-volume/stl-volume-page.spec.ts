import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { JobsService } from '../../core/api/jobs.service';
import { Job } from '../../models/job';
import { StlVolumePage } from './stl-volume-page';

describe('StlVolumePage', () => {
  const completedJob: Job = {
    id: 'volume-1',
    fileName: 'gear.stl',
    fileSizeBytes: 1024,
    status: 'completed',
    createdAt: '2026-08-21T12:00:00Z',
    report: {
      fileName: 'gear.stl',
      triangleCount: 1200,
      volume: 1000,
      boundingBox: { minX: 0, maxX: 10, minY: 0, maxY: 10, minZ: 0, maxZ: 10 },
      validation: { isValid: true, issues: [] },
    },
  };
  const jobsService = {
    createJob: vi.fn(),
    uploadFile: vi.fn(),
    getJob: vi.fn(() => of(completedJob)),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StlVolumePage],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: jobsService },
      ],
    });
  });

  function render(job: Job = completedJob) {
    const fixture = TestBed.createComponent(StlVolumePage);
    fixture.componentInstance.job.set(job);
    fixture.detectChanges();
    return fixture;
  }

  it('renders converted volume and the default material estimate', () => {
    const fixture = render();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('1 cm³');
    expect(text).toContain('1,000 mm³');
    expect(text).toContain('1 ml');
    expect(text).toContain('1.24 g');
    expect(text).toContain('0.19 g');
    expect(text).toContain('Volume calculated from the uploaded mesh.');
  });

  it('updates volume and mass when the model unit changes', () => {
    const fixture = render();
    fixture.componentInstance.modelUnit.set('cm');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('1,000 cm³');
    expect(text).toContain('1.24 kg');
  });

  it('warns when validation finds mesh issues while retaining the volume', () => {
    const fixture = render({
      ...completedJob,
      report: {
        ...(completedJob.report as Record<string, unknown>),
        validation: { isValid: false, issues: ['openEdges'] },
      },
    });
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('1 cm³');
    expect(text).toContain('calculated volume may be unreliable');
    expect(text).toContain('View full STL quality report');
  });

  it('updates custom density and infill estimates', () => {
    const fixture = render();
    fixture.componentInstance.material.set('custom');
    fixture.componentInstance.customDensity.set(2);
    fixture.componentInstance.infillPercentage.set(100);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('2 g');
    expect(fixture.nativeElement.textContent).toContain(
      'Simplified infill-based estimate',
    );
  });

  it('shows accessible errors for invalid custom density and infill', () => {
    const fixture = render();
    fixture.componentInstance.material.set('custom');
    fixture.componentInstance.customDensityTouched.set(true);
    fixture.componentInstance.infillPercentage.set(101);
    fixture.componentInstance.infillTouched.set(true);
    fixture.detectChanges();

    const alerts = fixture.nativeElement.querySelectorAll('[role="alert"]');
    expect(alerts.length).toBeGreaterThanOrEqual(2);
    expect(fixture.nativeElement.textContent).toContain(
      'Enter a finite density greater than zero.',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'Enter an infill percentage from 0 to 100.',
    );
    expect(fixture.nativeElement.querySelector('.weight-output')).toBeNull();
  });
});
