import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, Subject } from 'rxjs';
import { JobsService } from '../../core/api/jobs.service';
import { StlJobService } from '../../core/api/stl-job.service';
import { JobStatus, type Job } from '../../models/job';
import { JobOperation } from '../../models/job-operation';
import { StlRepairPage } from './stl-repair-page';
import { floatingPartsDemo } from './parts-fixtures';
const job: Job = {
  id: 'repair-control',
  fileName: 'cube-plus-two-fragments.stl',
  fileSizeBytes: 1084,
  createdAt: '2026-10-12T00:00:00Z',
  status: JobStatus.Created,
  upload: {
    url: 'https://uploads.example.com/stl',
    method: 'POST',
    fields: { key: 'control' },
    expiresAt: '2026-10-12T01:00:00Z',
  },
};
describe('standard repair alongside optional part removal', () => {
  const create = () => {
    const jobs = {
      uploadFile: vi.fn(() => of(undefined)),
      completeUpload: vi.fn(() => of(job)),
      getJob: vi.fn(() => NEVER),
    };
    const stlJobs = { create: vi.fn(() => of(job)) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: jobs },
        { provide: StlJobService, useValue: stlJobs },
      ],
    });
    const fixture = TestBed.createComponent(StlRepairPage);
    return { fixture, instance: fixture.componentInstance, jobs, stlJobs };
  };
  it('offers the generated three-part example at the file picker', () => {
    const { fixture } = create();
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    const picker = html.querySelector('#remove-floating-parts');
    expect(picker?.querySelector('app-stl-file-picker')).not.toBeNull();
    expect(html.querySelector('app-floating-parts')).toBeNull();
    expect(html.textContent).toContain('Try the three-part example');
    expect(html.textContent).toContain('Generated test geometry');
    fixture.destroy();
  });
  it('loads the generated example through the same file selection and analysis path', () => {
    const { fixture, instance, stlJobs } = create();
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector(
      'button',
    ) as HTMLButtonElement;
    button.click();
    expect(instance.selectedFile()?.name).toBe('cube-plus-two-fragments.stl');
    expect(instance.originalFile()).toBe(instance.selectedFile());
    expect(stlJobs.create).not.toHaveBeenCalled();
    fixture.destroy();
  });
  it('file selection does not upload; explicit standard cleanup always uploads the whole selected source', () => {
    const { fixture, instance, stlJobs, jobs } = create();
    const file = floatingPartsDemo();
    instance.onFileSelected(file);
    expect(stlJobs.create).not.toHaveBeenCalled();
    instance.repair();
    expect(stlJobs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: file.name,
        fileSizeBytes: file.size,
        operation: JobOperation.SafeStlRepair,
      }),
    );
    expect(jobs.uploadFile).toHaveBeenCalledWith(job.upload, file);
    expect(instance.job()?.id).toBe(job.id);
    fixture.destroy();
  });
  it('explicit retained-result inspection preserves the original for restoration', () => {
    const { fixture, instance } = create();
    const original = floatingPartsDemo();
    const retained = new File(
      ['solid retained\nendsolid retained'],
      'retained.stl',
    );
    instance.onFileSelected(original);
    instance.inspectRetained(retained);
    expect(instance.selectedFile()).toBe(retained);
    expect(instance.originalFile()).toBe(original);
    instance.restoreOriginal();
    expect(instance.selectedFile()).toBe(original);
    expect(instance.job()).toBeNull();
    fixture.destroy();
  });
  it('replacement cancels outstanding server upload callbacks and clears its report', () => {
    const { fixture, instance, stlJobs, jobs } = create();
    const upload = new Subject<undefined>();
    jobs.uploadFile.mockReturnValue(upload);
    instance.onFileSelected(floatingPartsDemo());
    instance.repair();
    const next = new File(['new'], 'new.stl');
    instance.onFileSelected(next);
    upload.next(undefined);
    upload.complete();
    expect(instance.selectedFile()).toBe(next);
    expect(instance.job()).toBeNull();
    expect(instance.submitting()).toBe(false);
    expect(stlJobs.create).toHaveBeenCalledTimes(1);
    expect(jobs.completeUpload).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
