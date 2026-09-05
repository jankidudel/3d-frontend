import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  output,
} from '@angular/core';
import { Job, JobStatus } from '../../../models/job';

const JOB_PROGRESS_SCROLL_TARGET_ID = 'job-progress-target';

@Component({
  selector: 'app-job-progress',
  templateUrl: './job-progress.html',
  styleUrl: './job-progress.scss',
})
export class JobProgress {
  private readonly document = inject(DOCUMENT);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private hasScrolledToProcessing = false;
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

  constructor() {
    effect(() => {
      if (
        this.hasScrolledToProcessing ||
        this.uploading() ||
        !this.processing()
      ) {
        return;
      }
      this.hasScrolledToProcessing = true;
      afterNextRender(
        () => {
          const target = this.scrollTarget();
          if (typeof target.scrollIntoView !== 'function') {
            return;
          }
          target.scrollIntoView({
            behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'center',
          });
        },
        { injector: this.injector },
      );
    });
  }

  private prefersReducedMotion(): boolean {
    return (
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
      false
    );
  }

  private scrollTarget(): HTMLElement {
    return (
      this.document.getElementById(JOB_PROGRESS_SCROLL_TARGET_ID) ??
      this.elementRef.nativeElement
    );
  }
}
