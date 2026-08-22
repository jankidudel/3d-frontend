import { TestBed } from '@angular/core/testing';
import { MAX_STL_FILE_SIZE_BYTES, StlFilePicker } from './stl-file-picker';
import { FILE_PICKER_TOO_LARGE_MESSAGE } from '../../../core/api/upload-limits';

describe('StlFilePicker', () => {
  it('accepts a non-empty STL file', () => {
    const component = TestBed.createComponent(StlFilePicker).componentInstance;
    component.selectFile(new File(['solid mesh'], 'rotor.STL'));
    expect(component.selectedFile()?.name).toBe('rotor.STL');
    expect(component.error()).toBe('');
  });

  it('rejects an invalid extension', () => {
    const component = TestBed.createComponent(StlFilePicker).componentInstance;
    component.selectFile(new File(['mesh'], 'rotor.obj'));
    expect(component.selectedFile()).toBeNull();
    expect(component.error()).toContain('.stl');
  });

  it('rejects an STL file larger than 25 MiB', () => {
    const component = TestBed.createComponent(StlFilePicker).componentInstance;
    const file = new File(['mesh'], 'rotor.stl');
    Object.defineProperty(file, 'size', { value: MAX_STL_FILE_SIZE_BYTES + 1 });

    component.selectFile(file);

    expect(component.selectedFile()).toBeNull();
    expect(component.error()).toBe(FILE_PICKER_TOO_LARGE_MESSAGE);
  });
});
