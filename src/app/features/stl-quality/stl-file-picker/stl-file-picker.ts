import { Component, output, signal } from '@angular/core';

@Component({
  selector: 'app-stl-file-picker',
  template: `
    <div class="picker">
      <label class="choose" for="stl-file">Choose STL file</label>
      <input id="stl-file" type="file" accept=".stl" (change)="onFileChange($event)" />
      <p class="hint">Select one non-empty .stl file. Your geometry stays in your browser.</p>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (selectedFile(); as file) {
        <dl class="file-details">
          <div><dt>File</dt><dd>{{ file.name }}</dd></div>
          <div><dt>Size</dt><dd>{{ file.size.toLocaleString() }} bytes</dd></div>
        </dl>
      }
    </div>
  `,
  styles: [`
    .picker { padding: clamp(1.25rem, 4vw, 2rem); border: 2px dashed var(--border); border-radius: .8rem; text-align: center; background: var(--soft); }
    input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
    .choose { display: inline-flex; padding: .7rem 1.1rem; border-radius: .55rem; color: white; background: var(--primary); font-weight: 750; cursor: pointer; }
    .hint { color: var(--muted); font-size: .9rem; }
    .error { color: var(--error); font-weight: 700; }
    .file-details { display: grid; gap: .35rem; margin: 1.25rem auto 0; max-width: 28rem; text-align: left; }
    .file-details div { display: grid; grid-template-columns: 4rem 1fr; gap: .75rem; }
    dt { font-weight: 750; } dd { margin: 0; overflow-wrap: anywhere; }
  `],
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
    this.error.set('');
    this.selectedFile.set(file);
    this.fileSelected.emit(file);
  }
}
