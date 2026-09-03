import { JobOperation } from './job-operation';

export interface CreateJobRequest {
  fileName: string;
  fileSizeBytes: number;
  operation?: JobOperation;
}
