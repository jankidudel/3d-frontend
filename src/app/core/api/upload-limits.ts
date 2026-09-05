export const GUEST_USER_MAX_FILE_UPLOAD_SIZE_MIB = 25;
const BYTES_PER_MEBIBYTE = 1024 * 1024;

/**
 * Central upload entitlement policy. Until authentication and paid-plan
 * entitlements exist, every visitor receives the guest limit.
 */
export function getMaxFileUploadSizeLimit(): number {
  return GUEST_USER_MAX_FILE_UPLOAD_SIZE_MIB * BYTES_PER_MEBIBYTE;
}

export function getMaxFileUploadSizeLimitMiB(): number {
  return getMaxFileUploadSizeLimit() / BYTES_PER_MEBIBYTE;
}

export function getFilePickerTooLargeMessage(format: string): string {
  return `The selected ${format} file must be ${getMaxFileUploadSizeLimitMiB()} MiB or smaller.`;
}

export function getFileSelectionHint(extension: string): string {
  return `Select a non-empty ${extension} file, up to ${getMaxFileUploadSizeLimitMiB()} MiB.`;
}

export const MAX_FREE_UPLOADS_PER_ROLLING_HOUR = 10;
export const MAX_FREE_UPLOADS_PER_ROLLING_DAY = 30;
export const ROLLING_DAY_HOURS = 24;
export const FILE_TOO_LARGE_MESSAGE = `Files must be ${GUEST_USER_MAX_FILE_UPLOAD_SIZE_MIB} MB or smaller.`;
export const FILE_PICKER_TOO_LARGE_MESSAGE =
  getFilePickerTooLargeMessage('STL');
