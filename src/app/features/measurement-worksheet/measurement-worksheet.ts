import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import {
  buildWorksheet,
  emptyWorksheetNotes,
  worksheetFields,
  worksheetLabels,
  WorksheetNotes,
  worksheetText,
} from './measurements';

@Component({
  selector: 'app-measurement-worksheet',
  template: ` <section class="worksheet">
    <h2>Measurement worksheet</h2>
    <p>
      This unsaved record stays in memory and disappears on reload. Download it
      deliberately to retain it. No account or browser storage is used. Labels
      and measurements are not sent to analytics or added to URLs.
    </p>
    <div class="editor">
      @for (field of fields; track field) {
        <label
          >{{ labels[field]
          }}<input
            [type]="field === 'date' ? 'date' : 'text'"
            maxlength="1000"
            [value]="notes()[field]"
            (input)="setNote(field, $event)"
        /></label>
      }
    </div>
    <div class="actions">
      <button class="button" type="button" (click)="download()">
        Download worksheet JSON
      </button>
      <button class="button button-secondary" type="button" (click)="copy()">
        Copy worksheet
      </button>
      <button class="button button-secondary" type="button" (click)="print()">
        Print worksheet
      </button>
    </div>
    <p role="status">{{ status() }}</p>
    <details class="preview" open>
      <summary>Worksheet preview and copy fallback</summary>
      <!-- The empty preview is page-independent filler for crawlers; render it
        only in the browser, where it reflects the visitor's entries. -->
      @defer (on idle) {
        <pre>{{ text() }}</pre>
      } @placeholder {
        <p>The worksheet text appears here as you enter values.</p>
      }
    </details>
  </section>`,
  styles: `
    .worksheet {
      margin-top: 1.5rem;
      padding: var(--tool-card-padding);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
    }
    .editor {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }
    label {
      display: grid;
      gap: 0.35rem;
    }
    input {
      width: 100%;
      box-sizing: border-box;
      min-height: 2.7rem;
      padding: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 0.4rem;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      margin: 1rem 0;
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 0.85rem;
      line-height: 1.6;
    }
    @media (max-width: 42rem) {
      .editor {
        grid-template-columns: 1fr;
      }
    }
    @media print {
      .editor,
      .actions,
      summary,
      .worksheet > p {
        display: none;
      }
      .worksheet {
        border: 0;
        padding: 0;
        break-before: page;
      }
      pre {
        font-size: 10pt;
        line-height: 1.4;
      }
    }
  `,
})
export class MeasurementWorksheet {
  readonly calculation = input.required<unknown>();
  readonly notes = model<WorksheetNotes>(emptyWorksheetNotes());
  readonly fields = worksheetFields;
  readonly labels = worksheetLabels;
  readonly record = computed(() =>
    buildWorksheet(this.calculation(), this.notes()),
  );
  readonly text = computed(() => worksheetText(this.record()));
  readonly status = signal('');
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  setNote(field: keyof WorksheetNotes, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.notes.update((notes) => ({ ...notes, [field]: value }));
  }
  download(): void {
    if (!this.isBrowser) {
      return;
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(this.record(), null, 2)], {
        type: 'application/json',
      }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'inspectmesh-measurement-worksheet.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.status.set(
      'Worksheet JSON download requested. Keep the file to retain this record.',
    );
  }
  async copy(): Promise<void> {
    if (!this.isBrowser) {
      return;
    }
    try {
      await navigator.clipboard.writeText(this.text());
      this.status.set('Worksheet copied.');
    } catch {
      this.status.set(
        'Clipboard unavailable. Select the worksheet preview to copy it.',
      );
    }
  }
  print(): void {
    if (this.isBrowser) {
      const preview =
        this.element.nativeElement.querySelector<HTMLDetailsElement>(
          '.preview',
        );
      const wasOpen = preview?.open;
      if (preview) {
        preview.open = true;
      }
      window.print();
      if (preview && wasOpen !== undefined) {
        preview.open = wasOpen;
      }
    }
  }
}
