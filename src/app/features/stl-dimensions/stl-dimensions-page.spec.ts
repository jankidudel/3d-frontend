import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { JobsService } from '../../core/api/jobs.service';
import { Job } from '../../models/job';
import { StlDimensionsPage } from './stl-dimensions-page';

describe('StlDimensionsPage', () => {
  const completedJob: Job = {
    id: 'dimensions-1',
    fileName: 'bracket.stl',
    fileSizeBytes: 1024,
    status: 'completed',
    createdAt: '2026-08-20T12:00:00Z',
    report: {
      fileName: 'bracket.stl',
      triangleCount: 1200,
      dimensions: { width: 50, height: 100, depth: 25 },
      boundingBox: {
        minX: -25,
        maxX: 25,
        minY: 0,
        maxY: 100,
        minZ: -12.5,
        maxZ: 12.5,
      },
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
      imports: [StlDimensionsPage],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: jobsService },
      ],
    });
  });

  function render() {
    const fixture = TestBed.createComponent(StlDimensionsPage);
    fixture.componentInstance.job.set(completedJob);
    fixture.detectChanges();
    return fixture;
  }

  it('puts measurements first and keeps technical details collapsed', () => {
    const fixture = render();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('50 × 100 × 25');
    expect(text).toContain('1,200 triangles');
    expect(text).toContain('No mesh validation issues found.');
    expect(fixture.nativeElement.querySelector('details').open).toBe(false);
    expect(fixture.nativeElement.querySelector('pre')).toBeNull();
  });

  it('updates conversions when the model unit changes', () => {
    const fixture = render();
    fixture.componentInstance.modelUnit.set('cm');
    fixture.detectChanges();

    const conversionText =
      fixture.nativeElement.querySelector('.conversion-grid').textContent;
    expect(conversionText).toContain('500 × 1,000 × 250 mm');
    expect(conversionText).toContain('19.685 × 39.37 × 9.843 in');
  });

  it('calculates a target dimension and proportional output', () => {
    const fixture = render();
    fixture.componentInstance.targetAxis.set('height');
    fixture.componentInstance.desiredUnit.set('cm');
    fixture.componentInstance.desiredSize.set(20);
    fixture.componentInstance.desiredSizeTouched.set(true);
    fixture.detectChanges();

    const output = fixture.nativeElement.querySelector('.scale-output');
    expect(output.textContent).toContain('200%');
    expect(output.textContent).toContain('2×');
    expect(output.textContent).toContain('10 × 20 × 5 cm');
  });

  it('shows accessible validation for empty or invalid desired sizes', () => {
    const fixture = render();
    fixture.componentInstance.desiredSizeTouched.set(true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="alert"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement
        .querySelector('input[type="number"]')
        .getAttribute('aria-invalid'),
    ).toBe('true');
    expect(fixture.nativeElement.querySelector('.scale-output')).toBeNull();
  });
});
