import {
  EMPTY,
  Observable,
  Subscription,
  expand,
  switchMap,
  takeWhile,
  throwError,
  timer,
} from 'rxjs';
import { Job, JobStatus } from '../../models/job';
import { JobsService } from './jobs.service';

export class MissingUploadDetailsError extends Error {}
export class PollingTimeoutError extends Error {}

export const MAX_AUTOMATIC_POLLING_DURATION_MS = 10 * 60 * 1000;

export function createAndUploadStlJob(
  jobsService: JobsService,
  file: File,
  onCreated: (job: Job) => void,
): Observable<void> {
  return jobsService
    .createJob({ fileName: file.name, fileSizeBytes: file.size })
    .pipe(
      switchMap((job) => {
        onCreated(job);
        return job.upload
          ? jobsService.uploadFile(job.upload, file)
          : throwError(() => new MissingUploadDetailsError());
      }),
    );
}

export function pollStlJob(
  jobsService: JobsService,
  jobId: string,
): Observable<Job> {
  const polling = timer(1000).pipe(
    switchMap(() => jobsService.getJob(jobId)),
    expand((job, index) =>
      isTerminalJob(job)
        ? EMPTY
        : timer(Math.min(2000 * 2 ** index, 10000)).pipe(
            switchMap(() => jobsService.getJob(jobId)),
          ),
    ),
    takeWhile((job) => !isTerminalJob(job), true),
  );

  return new Observable<Job>((subscriber) => {
    const subscriptions = new Subscription();
    const timeoutSubscription = timer(
      MAX_AUTOMATIC_POLLING_DURATION_MS,
    ).subscribe(() => {
      subscriptions.unsubscribe();
      subscriber.error(new PollingTimeoutError());
    });
    subscriptions.add(timeoutSubscription);
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
