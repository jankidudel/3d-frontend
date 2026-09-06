import { TestBed } from '@angular/core/testing';
import { FilePicker, FilePickerConfiguration } from './file-picker';

describe('FilePicker', () => {
  const stl: FilePickerConfiguration = {
    accept: '.stl',
    emptyFileMessage: 'Empty STL.',
    extension: '.stl',
    invalidFileMessage: 'STL only.',
    label: 'Choose STL file',
    limitMessage: 'Too large.',
    maxBytes: 10,
    noFileMessage: 'Choose a file.',
    selectionHint: 'Choose an STL.',
  };

  it('uses its passed configuration to accept only the requested format', () => {
    const fixture = TestBed.createComponent(FilePicker);
    fixture.componentRef.setInput('configuration', stl);
    let selected: File | null | undefined;
    fixture.componentInstance.fileSelected.subscribe(
      (file) => (selected = file),
    );
    const file = new File(['mesh'], 'part.STL');

    fixture.componentInstance.selectFile(file);

    expect(selected).toBe(file);
    expect(fixture.componentInstance.error()).toBe('');
  });

  it('rejects a format outside the passed configuration', () => {
    const fixture = TestBed.createComponent(FilePicker);
    fixture.componentRef.setInput('configuration', stl);

    fixture.componentInstance.selectFile(new File(['mesh'], 'part.3mf'));

    expect(fixture.componentInstance.error()).toBe('STL only.');
  });

  it('shows the selected file name and formatted size, and changes the action to reset it', () => {
    const fixture = TestBed.createComponent(FilePicker);
    const file = new File([new Uint8Array(1536)], 'bracket.stl');
    fixture.componentRef.setInput('configuration', stl);
    fixture.componentRef.setInput('selectedFileFromParent', file);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('bracket.stl');
    expect(fixture.nativeElement.textContent).toContain('1.5 KB');
    expect(fixture.nativeElement.textContent).toContain('Choose another file');

    fixture.componentRef.setInput('selectedFileFromParent', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('bracket.stl');
  });
});
