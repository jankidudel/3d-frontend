export type JobStatus = 'created' | 'processing' | 'completed' | 'failed';

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
  report?: unknown;
  failure?: JobFailure;
}
