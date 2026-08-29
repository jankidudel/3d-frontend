import { Component, input, output, viewChild } from '@angular/core';
import { MAX_STL_FILE_SIZE_BYTES } from '../../core/api/upload-limits';
import {
  FilePicker,
  FilePickerConfiguration,
} from '../../core/components/file-picker/file-picker';
import {
  MODEL_FILE_FORMAT_DETAILS,
  ModelFileFormat,
} from '../../core/formats/model-file-format';

@Component({
  selector: 'app-three-mf-file-picker',
  imports: [FilePicker],
  templateUrl: './threemf-file-picker.html',
})
export class ThreeMfFilePicker {
  readonly selectedFileFromParent = input<File | null>(null);
  readonly fileSelected = output<File | null>();
  readonly configuration: FilePickerConfiguration = {
    accept: MODEL_FILE_FORMAT_DETAILS[ModelFileFormat.ThreeMf].extension,
    emptyFileMessage: 'The selected 3MF file is empty.',
    extension: MODEL_FILE_FORMAT_DETAILS[ModelFileFormat.ThreeMf].extension,
    invalidFileMessage: 'The selected file must have a .3mf extension.',
    label: 'Choose 3MF file',
    limitMessage: 'The selected 3MF file must be 25 MiB or smaller.',
    maxBytes: MAX_STL_FILE_SIZE_BYTES,
    noFileMessage: 'Select a non-empty .3mf file, up to 25 MB.',
    selectionHint: 'Select a non-empty .3mf file, up to 25 MB.',
  };
  private readonly picker = viewChild(FilePicker);

  clear(): void {
    this.picker()?.clear();
  }
  open(): void {
    this.picker()?.open();
  }
}
