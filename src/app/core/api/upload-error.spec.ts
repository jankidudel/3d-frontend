import { HttpErrorResponse } from '@angular/common/http';
import { uploadErrorMessage } from './upload-error';
import { FILE_TOO_LARGE_MESSAGE } from './upload-limits';

describe('uploadErrorMessage', () => {
  it('formats a rate-limit response without backend details', () => {
    const error = new HttpErrorResponse({
      status: 429,
      error: {
        code: 'RATE_LIMITED',
        retryAfterSeconds: 120,
        message: 'internal detail',
      },
    });
    expect(uploadErrorMessage(error)).toBe(
      'Free limit reached: 10 uploads per rolling hour and 30 per rolling 24 hours. Please try again later.',
    );
  });

  it('formats a file-size response', () => {
    const error = new HttpErrorResponse({
      status: 413,
      error: { code: 'FILE_TOO_LARGE' },
    });
    expect(uploadErrorMessage(error)).toBe(FILE_TOO_LARGE_MESSAGE);
  });
});
