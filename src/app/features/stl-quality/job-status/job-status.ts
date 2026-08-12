import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Job } from '../../../models/job';

@Component({
  selector: 'app-job-status',
  imports: [DatePipe],
  template: `
    <section class="result card" aria-labelledby="job-title" aria-live="polite">
      <p class="eyebrow">Submission received</p>
      <h2 id="job-title">Job created</h2>
      <dl>
        <div><dt>File</dt><dd>{{ job().fileName }}</dd></div>
        <div><dt>Job ID</dt><dd class="id">{{ job().id }}</dd></div>
        <div><dt>Status</dt><dd><span class="status">{{ job().status }}</span></dd></div>
        <div><dt>Created</dt><dd>{{ job().createdAt | date: 'medium' }}</dd></div>
      </dl>
      <button class="button button-secondary" type="button" (click)="refresh.emit()" [disabled]="refreshing()">
        {{ refreshing() ? 'Refreshing…' : 'Refresh status' }}
      </button>
    </section>
  `,
  styles: [`
    .result { margin-top: 2rem; padding: clamp(1.25rem, 4vw, 2rem); }
    h2 { margin: .25rem 0 1rem; }
    dl { display: grid; gap: .65rem; }
    dl div { display: grid; grid-template-columns: 6rem minmax(0, 1fr); gap: 1rem; }
    dt { font-weight: 750; } dd { margin: 0; overflow-wrap: anywhere; }
    .status { display: inline-block; padding: .05rem .55rem; border-radius: 99px; color: var(--primary); background: var(--soft); font-weight: 750; }
    @media (max-width: 30rem) { dl div { grid-template-columns: 1fr; gap: 0; } }
  `],
})
export class JobStatusComponent {
  readonly job = input.required<Job>();
  readonly refreshing = input(false);
  readonly refresh = output<void>();
}
