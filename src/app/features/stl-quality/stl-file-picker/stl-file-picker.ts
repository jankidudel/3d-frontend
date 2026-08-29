import { Component, input, output, viewChild } from '@angular/core';
import {
  FILE_PICKER_TOO_LARGE_MESSAGE,
  MAX_STL_FILE_SIZE_BYTES,
} from '../../../core/api/upload-limits';
import {
  FilePicker,
  FilePickerConfiguration,
} from '../../../core/components/file-picker/file-picker';
import {
  MODEL_FILE_FORMAT_DETAILS,
  ModelFileFormat,
} from '../../../core/formats/model-file-format';

export { MAX_STL_FILE_SIZE_BYTES } from '../../../core/api/upload-limits';

@Component({
  selector: 'app-stl-file-picker',
  imports: [FilePicker],
  templateUrl: './stl-file-picker.html',
})
export class StlFilePicker {
  readonly selectedFileFromParent = input<File | null>(null);
  readonly fileSelected = output<File | null>();
  readonly configuration: FilePickerConfiguration = {
    accept: MODEL_FILE_FORMAT_DETAILS[ModelFileFormat.Stl].extension,
    emptyFileMessage: 'The selected STL file is empty.',
    extension: MODEL_FILE_FORMAT_DETAILS[ModelFileFormat.Stl].extension,
    invalidFileMessage: 'The selected file must have an .stl extension.',
    label: 'Choose STL file',
    limitMessage: FILE_PICKER_TOO_LARGE_MESSAGE,
    maxBytes: MAX_STL_FILE_SIZE_BYTES,
    noFileMessage: 'Choose an STL file to continue.',
    selectionHint: 'Select a non-empty .stl file.',
  };
  private readonly picker = viewChild(FilePicker);

  clear(): void {
    this.picker()?.clear();
  }

  open(): void {
    this.picker()?.open();
  }
}
