export type JobStatus =
  'created' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  fileName: string;
  fileSizeBytes: number;
  status: JobStatus;
  createdAt: string;
  uploadUrl?: string;
}
