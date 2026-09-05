import { Observable } from 'rxjs';
import { Job } from '../../models/job';
import { JobOperation } from '../../models/job-operation';
import { JobsService } from './jobs.service';
import { StlJobService } from './stl-job.service';
import { pollJob } from './job-polling';
import { createAndUploadFormatJob } from './job-upload-workflow';

export {
  MAX_AUTOMATIC_POLLING_DURATION_MS,
  PollingTimeoutError,
} from './job-polling';

export function createAndUploadStlJob(
  stlJobs: StlJobService,
  jobs: JobsService,
  file: File,
  onCreated: (job: Job) => void,
): Observable<void> {
  return createAndUploadFormatJob(stlJobs, jobs, file, onCreated);
}

export function createAndUploadStlRepairJob(
  stlJobs: StlJobService,
  jobs: JobsService,
  file: File,
  onCreated: (job: Job) => void,
): Observable<void> {
  return createAndUploadFormatJob(
    stlJobs,
    jobs,
    file,
    onCreated,
    JobOperation.SafeStlRepair,
  );
}

export function createAndUploadStlSplitJob(
  stlJobs: StlJobService,
  jobs: JobsService,
  file: File,
  axis: 'X' | 'Y' | 'Z',
  positionPercent: number,
  onCreated: (job: Job) => void,
): Observable<void> {
  return createAndUploadFormatJob(
    stlJobs,
    jobs,
    file,
    onCreated,
    JobOperation.StlSplit,
    { axis, positionPercent },
  );
}

export function pollStlJob(
  jobsService: JobsService,
  jobId: string,
): Observable<Job> {
  return pollJob(jobsService, jobId);
}
