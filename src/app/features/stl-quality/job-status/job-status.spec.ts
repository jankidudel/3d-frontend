import { TestBed } from '@angular/core/testing';
import { Job } from '../../../models/job';
import { JobStatusComponent } from './job-status';

describe('JobStatusComponent', () => {
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
  });

  it('renders camelCase issue codes with counts and messages', () => {
    const fixture = render({
      ...completedJob,
      report: {
        ...report,
        validation: {
          isValid: false,
          issues: [
            { code: 'nonManifoldEdges', count: 3 },
            {
              issueType: 'degenerateTriangles',
              message: 'Zero-area faces were detected.',
            },
            'invalidCoordinates',
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

  it('shows a helpful failed-job state without raw failure details', () => {
    const fixture = render({
      ...completedJob,
      status: 'failed',
      report: undefined,
      failure: { stack: 'private technical detail' },
    });

    expect(fixture.nativeElement.textContent).toContain(
      'We couldn’t analyse this model',
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      'private technical detail',
    );
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
    expect(revokeObjectUrl).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:quality-report');
    vi.useRealTimers();
  });
});
