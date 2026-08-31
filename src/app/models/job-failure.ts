import { JobFailure } from './job';
import { ModelFileFormat } from '../core/formats/model-file-format';

export type JobFailureCategory =
  | 'invalid_stl'
  | 'unsupported_format'
  | 'file_too_large'
  | 'processing_timeout'
  | 'unknown';

export type AnalysisFileFormat = ModelFileFormat;

export const GENERIC_JOB_FAILURE_MESSAGE =
  'We couldn’t analyse this file. Please check that it is a valid STL file and try again.';
export const GENERIC_THREE_MF_JOB_FAILURE_MESSAGE =
  'We couldn’t analyse this file. Please check that it is a valid 3MF file and try again.';

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
  return jobFailureMessageForFormat(failure, ModelFileFormat.Stl);
}

export function jobFailureMessageForFormat(
  failure: JobFailure | undefined,
  format: AnalysisFileFormat,
): string {
  const code = failure?.error?.code;
  if (!code) {
    return genericFailureMessage(format);
  }

  if (format === ModelFileFormat.ThreeMf) {
    return genericFailureMessage(format);
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

  return genericFailureMessage(format);
}

function genericFailureMessage(format: AnalysisFileFormat): string {
  return format === ModelFileFormat.Stl
    ? GENERIC_JOB_FAILURE_MESSAGE
    : GENERIC_THREE_MF_JOB_FAILURE_MESSAGE;
}

export function jobFailureCategory(
  failure: JobFailure | undefined,
): JobFailureCategory {
  const code = failure?.error?.code;
  if (code === 'invalid_stl' || code === 'malformed_stl') {
    return 'invalid_stl';
  }
  if (
    code === 'unsupported_format' ||
    code === 'file_too_large' ||
    code === 'processing_timeout'
  ) {
    return code;
  }
  if (
    code === 'processing_failed' &&
    failure?.error?.message === PROCESSOR_INVALID_STL_MESSAGE
  ) {
    return 'invalid_stl';
  }
  return 'unknown';
}
