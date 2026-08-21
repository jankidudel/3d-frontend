import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { finalize, Subscription } from 'rxjs';
import { JobsService } from '../../../core/api/jobs.service';
import {
  createAndUploadStlJob,
  pollStlJob,
} from '../../../core/api/stl-job-workflow';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
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
  private readonly analytics = inject(AnalyticsService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  private polling?: Subscription;
  private uploadStartedTracked = false;
  private uploadCompletedTracked = false;
  private outcomeTracked = false;
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
    this.destroyRef.onDestroy(() => this.polling?.unsubscribe());
  }

  onFileSelected(file: File | null): void {
    this.polling?.unsubscribe();
    this.selectedFile.set(file);
    this.error.set('');
    this.job.set(null);
    this.uploadStartedTracked = false;
    this.uploadCompletedTracked = false;
    this.outcomeTracked = false;
  }

  checkStl(): void {
    const file = this.selectedFile();
    if (!file) {
      this.error.set('Choose a valid STL file before starting the check.');
      return;
    }
    this.submitting.set(true);
    this.error.set('');
    if (!this.uploadStartedTracked) {
      this.analytics.trackUploadStarted('quality_check', file.size);
      this.uploadStartedTracked = true;
    }
    createAndUploadStlJob(this.jobsService, file, (job) => this.job.set(job))
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          if (!this.uploadCompletedTracked) {
            this.analytics.trackUploadCompleted('quality_check');
            this.uploadCompletedTracked = true;
          }
          const createdJob = this.job();
          if (createdJob) {
            this.startPolling(createdJob.id);
          }
        },
        error: () => {
          this.error.set(
            'We could not create the job or upload the file. Please try again.',
          );
        },
      });
  }

  private startPolling(jobId: string): void {
    this.polling?.unsubscribe();
    this.polling = pollStlJob(this.jobsService, jobId).subscribe({
      next: (job) => this.updateJob(job),
      error: () =>
        this.error.set(
          'Automatic status updates were interrupted. You can use Check again below, or upload the file again.',
        ),
    });
  }

  refreshStatus(): void {
    const currentJob = this.job();
    if (!currentJob) {
      return;
    }
    this.refreshing.set(true);
    this.error.set('');
    this.jobsService
      .getJob(currentJob.id)
      .pipe(finalize(() => this.refreshing.set(false)))
      .subscribe({
        next: (job) => this.updateJob(job),
        error: () =>
          this.error.set('We could not refresh this job. Please try again.'),
      });
  }

  private updateJob(job: Job): void {
    this.job.set(job);
    if (this.outcomeTracked) {
      return;
    }
    if (job.status === 'completed') {
      this.analytics.trackAnalysisCompleted('quality_check', job.report);
      this.outcomeTracked = true;
    } else if (job.status === 'failed') {
      this.analytics.trackAnalysisFailed('quality_check', job.failure);
      this.outcomeTracked = true;
    }
  }
}
