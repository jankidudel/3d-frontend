import { map, Observable, switchMap, tap, throwError } from 'rxjs';
import { Job } from '../../models/job';
import { JobOperation } from '../../models/job-operation';
import { FormatJobService } from './format-job.service';
import { JobsService } from './jobs.service';

export class MissingUploadDetailsError extends Error {}

export function createAndUploadFormatJob(
  formatJobs: FormatJobService,
  jobs: JobsService,
  file: File,
  onCreated: (job: Job) => void,
  operation?: JobOperation,
  split?: { axis: 'X' | 'Y' | 'Z'; positionPercent: number },
): Observable<void> {
  return formatJobs
    .create({
      fileName: file.name,
      fileSizeBytes: file.size,
      operation,
      splitAxis: split?.axis,
      splitPositionPercent: split?.positionPercent,
    })
    .pipe(
      switchMap((job) => {
        return job.upload
          ? jobs.uploadFile(job.upload, file).pipe(
              switchMap(() => jobs.completeUpload(job.id)),
              tap(() => onCreated(job)),
              map(() => undefined),
            )
          : throwError(() => new MissingUploadDetailsError());
      }),
    );
}
