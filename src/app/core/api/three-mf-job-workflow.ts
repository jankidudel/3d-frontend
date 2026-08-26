import { Observable } from 'rxjs';
import { Job } from '../../models/job';
import { createAndUploadFormatJob } from './job-upload-workflow';
import { JobsService } from './jobs.service';
import { ThreeMfJobService } from './three-mf-job.service';

export function createAndUploadThreeMfJob(
  threeMfJobs: ThreeMfJobService,
  jobs: JobsService,
  file: File,
  onCreated: (job: Job) => void,
): Observable<void> {
  return createAndUploadFormatJob(threeMfJobs, jobs, file, onCreated);
}
