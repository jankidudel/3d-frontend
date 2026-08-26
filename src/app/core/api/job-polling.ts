import {
  EMPTY,
  Observable,
  Subscription,
  expand,
  switchMap,
  takeWhile,
  timer,
} from 'rxjs';
import { Job, JobStatus } from '../../models/job';
import { JobsService } from './jobs.service';

export class PollingTimeoutError extends Error {}
export const MAX_AUTOMATIC_POLLING_DURATION_MS = 10 * 60 * 1000;

export function pollJob(jobs: JobsService, jobId: string): Observable<Job> {
  const polling = timer(1000).pipe(
    switchMap(() => jobs.getJob(jobId)),
    expand((job, index) =>
      isTerminalJob(job)
        ? EMPTY
        : timer(Math.min(2000 * 2 ** index, 10000)).pipe(
            switchMap(() => jobs.getJob(jobId)),
          ),
    ),
    takeWhile((job) => !isTerminalJob(job), true),
  );
  return new Observable<Job>((subscriber) => {
    const subscriptions = new Subscription();
    subscriptions.add(
      timer(MAX_AUTOMATIC_POLLING_DURATION_MS).subscribe(() => {
        subscriptions.unsubscribe();
        subscriber.error(new PollingTimeoutError());
      }),
    );
    subscriptions.add(
      polling.subscribe({
        next: (job) => subscriber.next(job),
        error: (error: unknown) => {
          subscriptions.unsubscribe();
          subscriber.error(error);
        },
        complete: () => {
          subscriptions.unsubscribe();
          subscriber.complete();
        },
      }),
    );
    return () => {
      subscriptions.unsubscribe();
    };
  });
}

function isTerminalJob(job: Job): boolean {
  return job.status === JobStatus.Completed || job.status === JobStatus.Failed;
}
