import { HttpErrorResponse } from '@angular/common/http';
import { ApiError } from '../../models/api-error';
import { FILE_TOO_LARGE_MESSAGE } from './upload-limits';
import {
  MAX_FREE_UPLOADS_PER_ROLLING_DAY,
  MAX_FREE_UPLOADS_PER_ROLLING_HOUR,
  ROLLING_DAY_HOURS,
} from './upload-limits';

export function uploadErrorMessage(error: unknown): string {
  const apiError =
    error instanceof HttpErrorResponse ? (error.error as ApiError) : undefined;
  if (apiError?.code === 'FILE_TOO_LARGE') {
    return FILE_TOO_LARGE_MESSAGE;
  }
  if (apiError?.code === 'RATE_LIMITED') {
    return `Free limit reached: ${MAX_FREE_UPLOADS_PER_ROLLING_HOUR} uploads per rolling hour and ${MAX_FREE_UPLOADS_PER_ROLLING_DAY} per rolling ${ROLLING_DAY_HOURS} hours. Please try again later.`;
  }
  return 'We could not create the job or upload the file. Please try again.';
}
