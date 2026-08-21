import { JobFailure } from './job';

export const GENERIC_JOB_FAILURE_MESSAGE =
  'We couldn’t analyse this file. Please check that it is a valid STL file and try again.';

const INVALID_STL_MESSAGE =
  'This file is not a valid STL file or appears to be incomplete.';
const UNSUPPORTED_STL_MESSAGE =
  'This file is not a supported STL format. Please upload an ASCII or binary STL file.';
const FILE_TOO_LARGE_MESSAGE =
  'This file is larger than the supported upload limit.';
const PROCESSING_TIMEOUT_MESSAGE =
  'This file took too long to analyse. Please try a smaller or simpler model.';

const SAFE_FAILURE_MESSAGES: Readonly<Record<string, string>> = {
  invalid_stl: INVALID_STL_MESSAGE,
  malformed_stl: INVALID_STL_MESSAGE,
  unsupported_format: UNSUPPORTED_STL_MESSAGE,
  file_too_large: FILE_TOO_LARGE_MESSAGE,
  processing_timeout: PROCESSING_TIMEOUT_MESSAGE,
};

const PROCESSOR_INVALID_STL_MESSAGE =
  'This file is not a valid STL file or is incomplete.';

export function jobFailureMessage(failure: JobFailure | undefined): string {
  const code = failure?.error?.code;
  if (!code) {
    return GENERIC_JOB_FAILURE_MESSAGE;
  }

  const mappedMessage = SAFE_FAILURE_MESSAGES[code];
  if (mappedMessage) {
    return mappedMessage;
  }

  if (
    code === 'processing_failed' &&
    failure?.error?.message === PROCESSOR_INVALID_STL_MESSAGE
  ) {
    return INVALID_STL_MESSAGE;
  }

  return GENERIC_JOB_FAILURE_MESSAGE;
}
