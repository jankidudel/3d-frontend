export type JobStatus =
  'created' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';

export interface JobUpload {
  url: string;
  method: 'PUT';
  expiresAt: string;
}

export interface Job {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  status: JobStatus;
  createdAt: string;
  upload?: JobUpload;
}
