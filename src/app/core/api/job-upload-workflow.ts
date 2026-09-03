import { Observable, switchMap, throwError } from 'rxjs';
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
): Observable<void> {
  return formatJobs
    .create({ fileName: file.name, fileSizeBytes: file.size, operation })
    .pipe(
      switchMap((job) => {
        onCreated(job);
        return job.upload
          ? jobs.uploadFile(job.upload, file)
          : throwError(() => new MissingUploadDetailsError());
      }),
    );
}
