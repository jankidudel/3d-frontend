import { TestBed } from '@angular/core/testing';
import { MAX_STL_FILE_SIZE_BYTES, StlFilePicker } from './stl-file-picker';
import { FILE_PICKER_TOO_LARGE_MESSAGE } from '../../../core/api/upload-limits';

describe('StlFilePicker', () => {
  it('accepts a non-empty STL file', () => {
    const fixture = TestBed.createComponent(StlFilePicker);
    const file = new File(['solid mesh'], 'rotor.STL');
    let emittedFile: File | null | undefined;
    fixture.componentInstance.fileSelected.subscribe((value) => {
      emittedFile = value;
    });

    fixture.componentInstance.selectFile(file);
    fixture.componentRef.setInput('selectedFileFromParent', file);
    fixture.detectChanges();

    expect(emittedFile).toBe(file);
    expect(fixture.componentInstance.selectedFile()?.name).toBe('rotor.STL');
    expect(fixture.componentInstance.error()).toBe('');
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

  it('clears the displayed file and native input when the parent clears the selection', () => {
    const fixture = TestBed.createComponent(StlFilePicker);
    const file = new File(['solid mesh'], 'rotor.stl');
    fixture.componentRef.setInput('selectedFileFromParent', file);
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector(
      '#stl-file',
    ) as HTMLInputElement;
    Object.defineProperty(input, 'value', {
      configurable: true,
      value: 'C:\\fakepath\\rotor.stl',
      writable: true,
    });

    fixture.componentRef.setInput('selectedFileFromParent', null);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedFile()).toBeNull();
    expect(input.value).toBe('');
  });

  it('opens the native file chooser on request', () => {
    const fixture = TestBed.createComponent(StlFilePicker);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      '#stl-file',
    ) as HTMLInputElement;
    const click = vi.spyOn(input, 'click');

    fixture.componentInstance.open();

    expect(click).toHaveBeenCalledOnce();
  });
});
