import { Component, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { finalize, switchMap, tap, throwError } from 'rxjs';
import { JobsService } from '../../../core/api/jobs.service';
import { Job } from '../../../models/job';
import { JobStatusComponent } from '../job-status/job-status';
import { StlFilePicker } from '../stl-file-picker/stl-file-picker';

@Component({
  selector: 'app-stl-quality-page',
  imports: [StlFilePicker, JobStatusComponent],
  templateUrl: './stl-quality-page.html',
  styleUrl: './stl-quality-page.scss',
})
export class StlQualityPage {
  private readonly jobsService = inject(JobsService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  readonly selectedFile = signal<File | null>(null);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);
  readonly refreshing = signal(false);
  readonly error = signal('');

  constructor() {
    this.title.setTitle('Free STL Quality Checker – Check 3D Printing Files');
    this.meta.updateTag({
      name: 'description',
      content:
        'Check STL files for common mesh problems including open edges, non-manifold geometry, duplicate triangles and orientation issues.',
    });
  }

  onFileSelected(file: File | null): void {
    this.selectedFile.set(file);
    this.error.set('');
    this.job.set(null);
  }

  checkStl(): void {
    const file = this.selectedFile();
    if (!file) {
      this.error.set('Choose a valid STL file before starting the check.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    this.jobsService
      .createJob({ fileName: file.name, fileSizeBytes: file.size })
      .pipe(
        tap((job) => this.job.set(job)),
        switchMap((job) =>
          job.upload
            ? this.jobsService.uploadFile(job.upload, file)
            : throwError(
                () => new Error('The API did not provide upload instructions.'),
              ),
        ),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        error: () =>
          this.error.set(
            'We could not create the job or upload the file. Please try again.',
          ),
      });
  }

  refreshStatus(): void {
    const currentJob = this.job();
    if (!currentJob) return;
    this.refreshing.set(true);
    this.error.set('');
    this.jobsService
      .getJob(currentJob.id)
      .pipe(finalize(() => this.refreshing.set(false)))
      .subscribe({
        next: (job) => this.job.set(job),
        error: () =>
          this.error.set('We could not refresh this job. Please try again.'),
      });
  }
}
