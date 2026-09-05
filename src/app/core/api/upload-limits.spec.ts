import { describe, expect, it } from 'vitest';
import {
  getMaxFileUploadSizeLimit,
  getFilePickerTooLargeMessage,
  getFileSelectionHint,
  GUEST_USER_MAX_FILE_UPLOAD_SIZE_MIB,
} from './upload-limits';

describe('getMaxFileUploadSizeLimit', () => {
  it('uses the reusable guest upload limit until an entitlement is available', () => {
    expect(GUEST_USER_MAX_FILE_UPLOAD_SIZE_MIB).toBe(25);
    expect(getMaxFileUploadSizeLimit()).toBe(25 * 1024 * 1024);
    expect(getFilePickerTooLargeMessage('3MF')).toContain('25 MiB');
    expect(getFileSelectionHint('.stl')).toContain('25 MiB');
  });
});
