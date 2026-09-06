import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../../models/api-error';
import { FILE_TOO_LARGE_MESSAGE } from './upload-limits';

export const UPLOAD_ALLOWANCE_REACHED_MESSAGE =
  'Your upload allowance has been reached. Please try again later.';
export const GENERIC_UPLOAD_FAILURE_MESSAGE =
  'We could not create the job or upload the file. Please try again.';

export function uploadErrorMessage(error: unknown): string {
  const apiError =
    error instanceof HttpErrorResponse ? (error.error as ApiError) : undefined;
  if (apiError?.code === 'FILE_TOO_LARGE') {
    return apiError.message || FILE_TOO_LARGE_MESSAGE;
  }
  if (apiError?.code === 'RATE_LIMITED') {
    return apiError.message || UPLOAD_ALLOWANCE_REACHED_MESSAGE;
  }
  return GENERIC_UPLOAD_FAILURE_MESSAGE;
}
