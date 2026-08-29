import { Component, computed, input, output } from '@angular/core';
import { Job, JobStatus } from '../../../models/job';

@Component({
  selector: 'app-job-progress',
  templateUrl: './job-progress.html',
  styleUrl: './job-progress.scss',
})
export class JobProgress {
  readonly job = input.required<Job>();
  readonly uploading = input(false);
  readonly pollingTimedOut = input(false);
  readonly refreshing = input(false);
  readonly headingId = input<string | null>(null);
  readonly refresh = output<void>();
  readonly processing = computed(
    () =>
      !this.pollingTimedOut() &&
      (this.job().status === JobStatus.Created ||
        this.job().status === JobStatus.Processing),
  );
}
