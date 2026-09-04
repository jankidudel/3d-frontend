import { Observable } from 'rxjs';
import { Job } from '../../models/job';
import { createAndUploadFormatJob } from './job-upload-workflow';
import { JobsService } from './jobs.service';
import { FormatJobService } from './format-job.service';

export function createAndUploadThreeMfJob(
  jobCreation: FormatJobService,
  jobs: JobsService,
  file: File,
  onCreated: (job: Job) => void,
): Observable<void> {
  return createAndUploadFormatJob(jobCreation, jobs, file, onCreated);
}
