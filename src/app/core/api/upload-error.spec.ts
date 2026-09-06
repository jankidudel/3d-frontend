import { HttpErrorResponse } from '@angular/common/http';
import { uploadErrorMessage } from './upload-error';
import { FILE_TOO_LARGE_MESSAGE } from './upload-limits';

describe('uploadErrorMessage', () => {
  it('uses the backend rate-limit message', () => {
    const error = new HttpErrorResponse({
      status: 429,
      error: {
        code: 'RATE_LIMITED',
        retryAfterSeconds: 120,
        message: 'The API-selected quota message.',
      },
    });
    expect(uploadErrorMessage(error)).toBe('The API-selected quota message.');
  });

  it('formats a file-size response', () => {
    const error = new HttpErrorResponse({
      status: 413,
      error: { code: 'FILE_TOO_LARGE' },
    });
    expect(uploadErrorMessage(error)).toBe(FILE_TOO_LARGE_MESSAGE);
  });
});
