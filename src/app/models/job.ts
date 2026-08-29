import { MeshQualityReport } from './mesh-quality-report';

export const JobStatus = {
  Created: 'created',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export interface JobUpload {
  url: string;
  method: 'POST';
  fields: Record<string, string>;
  expiresAt: string;
}

export interface JobFailure {
  reportVersion?: string;
  error?: {
    code?: string;
    message?: string;
  };
}

export interface Job {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  status: JobStatus;
  createdAt: string;
  upload?: JobUpload;
  report?: MeshQualityReport;
  failure?: JobFailure;
}
