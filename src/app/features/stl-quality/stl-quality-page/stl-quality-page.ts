import { Component, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { JobsService } from '../../../core/api/jobs.service';
import { Job } from '../../../models/job';
import { JobStatusComponent } from '../job-status/job-status';
import { StlFilePicker } from '../stl-file-picker/stl-file-picker';

@Component({
  selector: 'app-stl-quality-page',
  imports: [StlFilePicker, JobStatusComponent],
  template: `
    <main class="page">
      <p class="eyebrow">Free mesh preflight</p>
      <h1>STL Quality Check</h1>
      <p class="lead">Check an STL file for common mesh problems before 3D printing, including open edges, non-manifold geometry, duplicate triangles and orientation issues.</p>

      <section class="checker card" aria-labelledby="upload-title">
        <h2 id="upload-title">Choose your file</h2>
        <p>We use the file name and size to create a quality-check job. STL geometry is not parsed by this page.</p>
        <app-stl-file-picker (fileSelected)="onFileSelected($event)" />
        <button class="button submit" type="button" (click)="checkStl()" [disabled]="!selectedFile() || submitting()">
          {{ submitting() ? 'Creating job…' : 'Check STL' }}
        </button>
        @if (error(); as message) { <p class="error" role="alert">{{ message }}</p> }
      </section>

      @if (job(); as createdJob) {
        <app-job-status [job]="createdJob" [refreshing]="refreshing()" (refresh)="refreshStatus()" />
      }

      <section class="content" aria-labelledby="checks-title">
        <h2 id="checks-title">Catch common STL issues before printing</h2>
        <p>A mesh quality check can flag topology and orientation problems early, helping you avoid failed slicing or unexpected gaps in a print. Submit your STL metadata above to start a job, then refresh its status when you are ready.</p>
      </section>
    </main>
  `,
  styles: [`
    .checker { max-width: 46rem; margin-top: 2.5rem; padding: clamp(1.25rem, 4vw, 2rem); }
    .checker > h2 { margin: 0; }
    .checker > p { color: var(--muted); }
    app-stl-file-picker { display: block; margin-block: 1.5rem; }
    .submit { width: 100%; }
    .error { color: var(--error) !important; font-weight: 700; }
    app-job-status { display: block; max-width: 46rem; }
    .content { max-width: 46rem; margin-top: 3rem; }
    .content p { color: var(--muted); }
  `],
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
    this.meta.updateTag({ name: 'description', content: 'Check STL files for common mesh problems including open edges, non-manifold geometry, duplicate triangles and orientation issues.' });
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
    this.jobsService.createJob({ fileName: file.name, fileSizeBytes: file.size })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (job) => this.job.set(job),
        error: () => this.error.set('We could not create the job. Check that the API is available and try again.'),
      });
  }

  refreshStatus(): void {
    const currentJob = this.job();
    if (!currentJob) return;
    this.refreshing.set(true);
    this.error.set('');
    this.jobsService.getJob(currentJob.id)
      .pipe(finalize(() => this.refreshing.set(false)))
      .subscribe({
        next: (job) => this.job.set(job),
        error: () => this.error.set('We could not refresh this job. Please try again.'),
      });
  }
}
