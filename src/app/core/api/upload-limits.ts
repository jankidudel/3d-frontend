export const MAX_STL_FILE_SIZE_MIB = 25;
export const MAX_STL_FILE_SIZE_BYTES = MAX_STL_FILE_SIZE_MIB * 1024 * 1024;
export const MAX_FREE_UPLOADS_PER_ROLLING_HOUR = 10;
export const MAX_FREE_UPLOADS_PER_ROLLING_DAY = 30;
export const ROLLING_DAY_HOURS = 24;
export const FILE_TOO_LARGE_MESSAGE = `Files must be ${MAX_STL_FILE_SIZE_MIB} MB or smaller.`;
export const FILE_PICKER_TOO_LARGE_MESSAGE = `The selected STL file must be ${MAX_STL_FILE_SIZE_MIB} MiB or smaller.`;
