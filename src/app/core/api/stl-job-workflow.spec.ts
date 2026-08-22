import { NEVER } from 'rxjs';
import { vi } from 'vitest';
import {
  MAX_AUTOMATIC_POLLING_DURATION_MS,
  PollingTimeoutError,
  pollStlJob,
} from './stl-job-workflow';
import { JobsService } from './jobs.service';

describe('pollStlJob', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops with a timeout after the maximum automatic polling duration', async () => {
    vi.useFakeTimers();
    const jobsService = {
      getJob: vi.fn(() => NEVER),
    } as unknown as JobsService;
    let receivedError: unknown;

    pollStlJob(jobsService, 'job-123').subscribe({
      error: (error: unknown) => {
        receivedError = error;
      },
    });

    await vi.advanceTimersByTimeAsync(MAX_AUTOMATIC_POLLING_DURATION_MS);

    expect(receivedError).toBeInstanceOf(PollingTimeoutError);
  });
});
