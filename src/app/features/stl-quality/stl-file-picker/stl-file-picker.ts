import { Component, output, signal } from '@angular/core';

export const MAX_STL_FILE_SIZE_BYTES = 25 * 1024 * 1024;

@Component({
  selector: 'app-stl-file-picker',
  templateUrl: './stl-file-picker.html',
  styleUrl: './stl-file-picker.scss',
})
export class StlFilePicker {
  readonly fileSelected = output<File | null>();
  readonly selectedFile = signal<File | null>(null);
  readonly error = signal('');

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectFile(input.files?.item(0) ?? null);
  }

  selectFile(file: File | null): void {
    this.selectedFile.set(null);
    if (!file) {
      this.error.set('Choose an STL file to continue.');
      this.fileSelected.emit(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.stl')) {
      this.error.set('The selected file must have an .stl extension.');
      this.fileSelected.emit(null);
      return;
    }
    if (file.size === 0) {
      this.error.set('The selected STL file is empty.');
      this.fileSelected.emit(null);
      return;
    }
    if (file.size > MAX_STL_FILE_SIZE_BYTES) {
      this.error.set('The selected STL file must be 25 MiB or smaller.');
      this.fileSelected.emit(null);
      return;
    }
    this.error.set('');
    this.selectedFile.set(file);
    this.fileSelected.emit(file);
  }
}
