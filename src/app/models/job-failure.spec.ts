import { GENERIC_JOB_FAILURE_MESSAGE, jobFailureMessage } from './job-failure';

describe('jobFailureMessage', () => {
  it.each([
    [
      'invalid_stl',
      'This file is not a valid STL file or appears to be incomplete.',
    ],
    [
      'malformed_stl',
      'This file is not a valid STL file or appears to be incomplete.',
    ],
    [
      'unsupported_format',
      'This file is not a supported STL format. Please upload an ASCII or binary STL file.',
    ],
    ['file_too_large', 'This file is larger than the supported upload limit.'],
    [
      'processing_timeout',
      'This file took too long to analyse. Please try a smaller or simpler model.',
    ],
  ])('maps the recognised %s code to controlled copy', (code, expected) => {
    expect(jobFailureMessage({ error: { code } })).toBe(expected);
  });

  it('maps the current processor invalid-STL response by exact code and message', () => {
    expect(
      jobFailureMessage({
        error: {
          code: 'processing_failed',
          message: 'This file is not a valid STL file or is incomplete.',
        },
      }),
    ).toBe('This file is not a valid STL file or appears to be incomplete.');
  });

  it.each([
    undefined,
    {},
    { error: {} },
    { error: { code: 'unknown_failure' } },
    {
      error: {
        code: 'processing_failed',
        message: 'stack trace and s3://private-bucket/jobs/private-key',
      },
    },
  ])(
    'uses the generic fallback for missing or unrecognised details',
    (failure) => {
      expect(jobFailureMessage(failure)).toBe(GENERIC_JOB_FAILURE_MESSAGE);
    },
  );
});
