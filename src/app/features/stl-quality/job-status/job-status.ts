import { DatePipe, JsonPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { Job } from '../../../models/job';

@Component({
  selector: 'app-job-status',
  imports: [DatePipe, JsonPipe],
  templateUrl: './job-status.html',
  styleUrl: './job-status.scss',
})
export class JobStatusComponent {
  readonly job = input.required<Job>();
  readonly refreshing = input(false);
  readonly refresh = output<void>();
  readonly processing = computed(() => {
    const status = this.job().status;
    return status === 'created' || status === 'processing';
  });
}
