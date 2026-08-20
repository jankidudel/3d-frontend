import {
  EMPTY,
  Observable,
  expand,
  switchMap,
  takeWhile,
  throwError,
  timer,
} from 'rxjs';
import { Job } from '../../models/job';
import { JobsService } from './jobs.service';

export class MissingUploadDetailsError extends Error {}

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
  return timer(1000).pipe(
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
}

function isTerminalJob(job: Job): boolean {
  return job.status === 'completed' || job.status === 'failed';
}
