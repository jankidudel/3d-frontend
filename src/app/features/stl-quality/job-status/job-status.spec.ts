import { TestBed } from '@angular/core/testing';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { Job } from '../../../models/job';
import { JobStatusComponent } from './job-status';

describe('JobStatusComponent', () => {
  const analytics = { trackReportDownloaded: vi.fn() };
  const report = {
    reportVersion: '1.0',
    fileName: 'gear housing.stl',
    fileSizeBytes: 22284,
    triangleCount: 444,
    boundingBox: {
      minX: 15.5,
      minY: -10,
      minZ: 10.9,
      maxX: 20.5,
      maxY: 10,
      maxZ: 15.3,
    },
    dimensions: { width: 5, height: 20, depth: 4.35432 },
    surfaceArea: 343.889,
    volume: 362.606,
    validation: { issues: [], isValid: true },
  };
  const completedJob: Job = {
    id: 'job-1',
    fileName: 'gear housing.stl',
    fileSizeBytes: 22284,
    status: 'completed',
    createdAt: '2026-08-20T12:00:00Z',
    report,
  };

  beforeEach(() => {
    analytics.trackReportDownloaded.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: AnalyticsService, useValue: analytics }],
    });
  });

  function render(job: Job = completedJob) {
    const fixture = TestBed.createComponent(JobStatusComponent);
    fixture.componentRef.setInput('job', job);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a valid report with rounded metrics and technical details collapsed', () => {
    const fixture = render();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Model passed validation');
    expect(text).toContain('No mesh validation issues found');
    expect(text).toContain('5 × 20 × 4.35');
    expect(text).toContain('343.89');
    expect(text).toContain('362.61');
    expect(text).toContain('21.8 KB');
    expect(fixture.nativeElement.querySelector('details').open).toBe(false);
    expect(text).not.toContain('ready to print');
    expect(text).toContain('What to do next');
    expect(text).toContain('No checked mesh issues were found');
  });

  it('shows a one-component topology metric when supplied', () => {
    const fixture = render({
      ...completedJob,
      report: { ...report, topology: { connectedComponentCount: 1 } },
    });

    expect(fixture.nativeElement.textContent).toContain(
      '1 connected component',
    );
  });

  it('explains why local highlights cannot be viewed after a refreshed result', () => {
    const fixture = render({
      ...completedJob,
      report: {
        ...report,
        issueHighlights: {
          samples: {
            open_edge: [{ a: { x: 0, y: 0, z: 0 }, b: { x: 1, y: 0, z: 0 } }],
          },
        },
      },
    });

    expect(fixture.nativeElement.textContent).toContain(
      'no longer in this browser session',
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'View highlighted issues',
    );
  });

  it('shows disconnected-shell warning and interpretation guidance without failing validation', () => {
    const fixture = render({
      ...completedJob,
      report: {
        ...report,
        topology: { connectedComponentCount: 2 },
        validation: {
          isValid: true,
          issues: [
            {
              code: 'multiple_disconnected_shells',
              count: 2,
              severity: 'warning',
              message:
                'This STL contains 2 separate mesh components. This can be intentional, but check that all parts are expected before printing.',
            },
          ],
        },
      },
    });
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Model passed validation');
    expect(text).toContain('2 separate components');
    expect(text).toContain('Multiple disconnected shells');
    expect(text).toContain('Check separate components');
    expect(text).toContain('This can be intentional');
    expect(text).toContain(
      'Confirm whether the separate parts are intentional',
    );
    expect(text).not.toContain('Problems found');
  });

  it('hides the component metric safely when older reports omit topology', () => {
    const fixture = render();

    expect(fixture.nativeElement.textContent).not.toContain(
      'Connected components',
    );
  });

  it.each([
    ['open_edge', 'Fix open edges', 'not fully watertight'],
    [
      'non_manifold_edge',
      'Fix non-manifold edges',
      'mesh geometry is ambiguous',
    ],
    [
      'degenerate_triangle',
      'Clean degenerate triangles',
      'zero-area or nearly zero-area faces',
    ],
    [
      'duplicate_triangle',
      'Remove duplicate triangles',
      'Duplicate or overlapping faces',
    ],
    [
      'inconsistent_orientation',
      'Repair face orientation',
      'Some face normals point in the wrong direction',
    ],
    [
      'invalid_coordinates',
      'Re-export invalid geometry',
      'unusable numeric geometry',
    ],
  ])('shows guidance for %s', (code, title, meaning) => {
    const fixture = render({
      ...completedJob,
      report: {
        ...report,
        validation: { isValid: false, issues: [{ code, count: 1 }] },
      },
    });
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('What to do next');
    expect(text).toContain(title);
    expect(text).toContain(meaning);
    expect(text).toContain(
      'InspectMesh identifies issues; it does not repair files.',
    );
    expect(
      fixture.nativeElement.querySelectorAll('.repair-guidance-card'),
    ).toHaveLength(1);
  });

  it('shows one guidance card for each distinct recognised issue', () => {
    const fixture = render({
      ...completedJob,
      report: {
        ...report,
        validation: {
          isValid: false,
          issues: [
            'open_edge',
            { code: 'open_edge', count: 2 },
            'duplicate_triangle',
          ],
        },
      },
    });
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Fix open edges');
    expect(text).toContain('Remove duplicate triangles');
    expect(
      fixture.nativeElement.querySelectorAll('.repair-guidance-card'),
    ).toHaveLength(2);
  });

  it('keeps unknown issues in the validation list without inventing guidance', () => {
    const fixture = render({
      ...completedJob,
      report: {
        ...report,
        validation: {
          isValid: false,
          issues: [{ code: 'selfIntersectingGeometry', count: null }],
        },
      },
    });
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Self Intersecting Geometry');
    expect(text).toContain('What to do next');
    expect(
      fixture.nativeElement.querySelectorAll('.repair-guidance-card'),
    ).toHaveLength(0);
  });

  it('renders processor issue codes with counts and messages', () => {
    const fixture = render({
      ...completedJob,
      report: {
        ...report,
        validation: {
          isValid: false,
          issues: [
            { code: 'non_manifold_edge', count: 3 },
            {
              issueType: 'degenerate_triangle',
              message: 'Zero-area faces were detected.',
            },
            'invalid_coordinates',
          ],
        },
      },
    });
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Problems found');
    expect(text).toContain('Non-manifold edges');
    expect(text).toContain('3 found');
    expect(text).toContain('Degenerate triangles');
    expect(text).toContain('Zero-area faces were detected.');
    expect(text).toContain('Invalid coordinates');
  });

  it('handles a partial report without exposing undefined values', () => {
    const fixture = render({
      ...completedJob,
      report: { validation: { isValid: true, issues: [] } },
    });

    expect(fixture.nativeElement.textContent).toContain('— × — × —');
    expect(fixture.nativeElement.textContent).not.toContain('undefined');
  });

  it('shows the safe processor reason and an obvious retry path', () => {
    const fixture = render({
      ...completedJob,
      status: 'failed',
      report: undefined,
      failure: {
        error: {
          code: 'processing_failed',
          message: 'This file is not a valid STL file or is incomplete.',
        },
      },
    });

    expect(fixture.nativeElement.textContent).toContain(
      'We couldn’t analyse this STL file',
    );
    expect(fixture.nativeElement.textContent).toContain(
      'This file is not a valid STL file or appears to be incomplete.',
    );
    expect(fixture.nativeElement.textContent).toContain('Upload another file');
  });

  it('uses the generic fallback without rendering an internal message', () => {
    const fixture = render({
      ...completedJob,
      status: 'failed',
      report: undefined,
      failure: {
        error: {
          code: 'internal_lambda_error',
          message: 'stack trace and s3://private-bucket/jobs/private-key',
        },
      },
    });
    const text = fixture.nativeElement.textContent;

    expect(text).toContain(
      'We couldn’t analyse this file. Please check that it is a valid STL file and try again.',
    );
    expect(text).not.toContain('stack trace');
    expect(text).not.toContain('private-bucket');
  });

  it('downloads the JSON with a safe filename and revokes the object URL', async () => {
    vi.useFakeTimers();
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:quality-report');
    const revokeObjectUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const fixture = render({
      ...completedJob,
      report: { ...report, fileName: 'My unsafe/model.stl' },
    });

    fixture.componentInstance.downloadReport();
    const anchor = click.mock.instances[0] as HTMLAnchorElement;

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchor.download).toBe('My-unsafe-model-quality-report.json');
    expect(anchor.href).toBe('blob:quality-report');
    expect(analytics.trackReportDownloaded).toHaveBeenCalledWith(
      'quality_check',
      'json',
    );
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:quality-report');
    vi.useRealTimers();
  });
});
