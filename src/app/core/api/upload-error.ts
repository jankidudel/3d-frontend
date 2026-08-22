import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../../models/api-error';
import { FILE_TOO_LARGE_MESSAGE } from './upload-limits';

export function uploadErrorMessage(error: unknown): string {
  const apiError =
    error instanceof HttpErrorResponse ? (error.error as ApiError) : undefined;
  if (apiError?.code === 'FILE_TOO_LARGE') {
    return FILE_TOO_LARGE_MESSAGE;
  }
  if (apiError?.code === 'RATE_LIMITED') {
    const seconds = apiError.retryAfterSeconds;
    if (typeof seconds === 'number' && seconds > 0) {
      return `You have reached the free upload limit. Please try again in ${retryTime(seconds)}.`;
    }
    return 'You have reached the free upload limit. Please try again later.';
  }
  return 'We could not create the job or upload the file. Please try again.';
}

function retryTime(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.ceil(seconds / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  return `${Math.ceil(seconds)} second${Math.ceil(seconds) === 1 ? '' : 's'}`;
}
