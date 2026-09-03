import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { JobsService } from '../../core/api/jobs.service';
import { StlJobService } from '../../core/api/stl-job.service';
import { AnalyticsService } from '../../core/analytics/analytics.service';
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
    uploadFile: vi.fn(),
    getJob: vi.fn(() => of(completedJob)),
  };
  const stlJobs = { create: vi.fn() };
  const analytics = {
    trackUploadStarted: vi.fn(),
    trackUploadCompleted: vi.fn(),
    trackAnalysisCompleted: vi.fn(),
    trackAnalysisFailed: vi.fn(),
    trackScaleCalculated: vi.fn(),
    trackPrinterFitChecked: vi.fn(),
  };

  beforeEach(() => {
    Object.values(analytics).forEach((method) => method.mockReset());
    TestBed.configureTestingModule({
      imports: [StlDimensionsPage],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: jobsService },
        { provide: StlJobService, useValue: stlJobs },
        { provide: AnalyticsService, useValue: analytics },
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

  it('shows the shared safe failed-job experience', () => {
    const fixture = TestBed.createComponent(StlDimensionsPage);
    fixture.componentInstance.job.set({
      ...completedJob,
      status: 'failed',
      report: undefined,
      failure: { error: { code: 'unsupported_format' } },
    });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('We couldn’t analyse this STL file');
    expect(text).toContain(
      'This file is not a supported STL format. Please upload an ASCII or binary STL file.',
    );
    expect(text).toContain('Upload another file');
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

  it('removes floating-point noise from converted dimensions near whole values', () => {
    const fixture = TestBed.createComponent(StlDimensionsPage);
    fixture.componentInstance.job.set({
      ...completedJob,
      report: {
        ...(completedJob.report as Record<string, unknown>),
        dimensions: { width: 29.99999, height: 4, depth: 13 },
      },
    });
    fixture.componentInstance.modelUnit.set('m');
    fixture.detectChanges();

    const conversionText =
      fixture.nativeElement.querySelector('.conversion-grid').textContent;
    expect(conversionText).toContain('3,000 × 400 × 1,300 cm');
    expect(conversionText).not.toContain('2,999.999');
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

    fixture.componentInstance.trackScaleCalculation();
    fixture.componentInstance.trackScaleCalculation();
    expect(analytics.trackScaleCalculated).toHaveBeenCalledOnce();
    expect(analytics.trackScaleCalculated).toHaveBeenCalledWith('height');
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

  it('does not show a printer-volume error before input', () => {
    const fixture = render();

    expect(fixture.nativeElement.querySelector('.fit-result')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain(
      'Enter a finite value greater than zero for all three printer',
    );
  });

  it('renders exceeded axes and the recommended maximum scale', () => {
    const fixture = TestBed.createComponent(StlDimensionsPage);
    fixture.componentInstance.job.set({
      ...completedJob,
      report: {
        ...(completedJob.report as Record<string, unknown>),
        dimensions: { width: 230, height: 190, depth: 260 },
      },
    });
    fixture.componentInstance.buildWidth.set(220);
    fixture.componentInstance.buildHeight.set(220);
    fixture.componentInstance.buildDepth.set(250);
    fixture.componentInstance.buildVolumeTouched.set(true);
    fixture.detectChanges();

    const result = fixture.nativeElement.querySelector('.fit-result');
    const tables = fixture.nativeElement.querySelectorAll('.fit-table');
    expect(result.textContent).toContain('Does not fit at its current scale');
    expect(result.textContent).toContain('95.65%');
    expect(tables[1].textContent).toContain('Width');
    expect(tables[1].textContent).toContain('Depth');
    expect(tables[1].textContent).toContain('Exceeds by 10 mm');
    expect(tables[1].querySelectorAll('.exceeded')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain(
      'does not fit the selected printer in any tested 90-degree orientation',
    );
    expect(fixture.nativeElement.textContent).toContain(
      '220 × 181.739 × 248.696 mm',
    );

    fixture.componentInstance.trackPrinterFitCheck();
    fixture.componentInstance.trackPrinterFitCheck();
    expect(analytics.trackPrinterFitChecked).toHaveBeenCalledOnce();
    expect(analytics.trackPrinterFitChecked).toHaveBeenCalledWith(false);
  });

  it('recalculates printer fit when the model unit changes', () => {
    const fixture = render();
    fixture.componentInstance.buildWidth.set(60);
    fixture.componentInstance.buildHeight.set(110);
    fixture.componentInstance.buildDepth.set(30);
    fixture.componentInstance.buildVolumeTouched.set(true);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.fit-result').textContent,
    ).toContain('Fits in current orientation');

    fixture.componentInstance.modelUnit.set('cm');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.fit-result').textContent,
    ).toContain('Does not fit at its current scale');
  });

  it('shows validation after partial or zero printer input', () => {
    const fixture = render();
    fixture.componentInstance.buildWidth.set(0);
    fixture.componentInstance.buildVolumeTouched.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Enter a finite value greater than zero for all three printer',
    );
    expect(fixture.nativeElement.querySelector('.fit-result')).toBeNull();
  });
});
