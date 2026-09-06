import {
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export interface FilePickerConfiguration {
  readonly accept: string;
  readonly emptyFileMessage: string;
  readonly extension: string;
  readonly invalidFileMessage: string;
  readonly label: string;
  readonly limitMessage: string;
  readonly maxBytes: number;
  readonly noFileMessage: string;
  readonly selectionHint: string;
}

@Component({
  selector: 'app-file-picker',
  templateUrl: './file-picker.html',
  styleUrl: './file-picker.scss',
})
export class FilePicker {
  readonly configuration = input.required<FilePickerConfiguration>();
  readonly selectedFileFromParent = input<File | null>(null);
  readonly fileSelected = output<File | null>();
  readonly selectedFile = computed(() => this.selectedFileFromParent());
  readonly error = signal('');
  private readonly fileInput =
    viewChild<ElementRef<HTMLInputElement>>('fileInput');

  constructor() {
    effect(() => {
      if (this.selectedFileFromParent() === null) {
        this.clearNativeInput();
      }
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectFile(input.files?.item(0) ?? null);
  }

  selectFile(file: File | null): void {
    const configuration = this.configuration();
    if (!file) {
      this.reject(configuration.noFileMessage);
      return;
    }
    if (!file.name.toLowerCase().endsWith(configuration.extension)) {
      this.reject(configuration.invalidFileMessage);
      return;
    }
    if (file.size === 0) {
      this.reject(configuration.emptyFileMessage);
      return;
    }
    if (file.size > configuration.maxBytes) {
      this.reject(configuration.limitMessage);
      return;
    }
    this.error.set('');
    this.fileSelected.emit(file);
  }

  clear(): void {
    this.clearNativeInput();
  }

  open(): void {
    this.fileInput()?.nativeElement.click();
  }

  formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private reject(message: string): void {
    this.error.set(message);
    this.clearNativeInput();
    this.fileSelected.emit(null);
  }

  private clearNativeInput(): void {
    const fileInput = this.fileInput();
    if (fileInput) {
      fileInput.nativeElement.value = '';
    }
  }
}
