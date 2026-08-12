import { TestBed } from '@angular/core/testing';
import { StlFilePicker } from './stl-file-picker';

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
});
