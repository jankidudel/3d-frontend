import { Component, computed, input, model } from '@angular/core';
import { emptyReading, Reading, summarizeReadings } from './measurements';

@Component({
  selector: 'app-repeat-readings',
  template: ` <fieldset>
    <legend>{{ label() }} (mm)</legend>
    @for (reading of readings(); track $index; let index = $index) {
      <div class="reading">
        <label
          >Reading {{ index + 1 }} (mm)<input
            type="number"
            min="0.001"
            step="any"
            [value]="reading.value ?? ''"
            (input)="setValue(index, $event)"
        /></label>
        <label class="include"
          ><input
            type="checkbox"
            [checked]="reading.included"
            (change)="include(index, $event)"
          />Include in mean</label
        >
        @if (!reading.included) {
          <label
            >Exclusion reason (required)<input
              type="text"
              maxlength="500"
              [value]="reading.reason"
              (input)="reason(index, $event)"
          /></label>
        }
        @if (index > 0 && reading.value === null && !reading.reason) {
          <button
            class="button button-secondary"
            type="button"
            (click)="removeEmpty(index)"
          >
            Remove empty reading {{ index + 1 }}
          </button>
        }
      </div>
    }
    <button
      type="button"
      class="button button-secondary"
      (click)="add()"
      [disabled]="readings().length >= 20"
    >
      Add comparable reading
    </button>
    @if (summary(); as s) {
      <p>
        {{ s.count }} {{ s.count === 1 ? 'reading' : 'included readings' }}.
        Mean {{ format(s.mean) }} mm; min {{ format(s.minimum) }}; max
        {{ format(s.maximum) }}; range {{ format(s.range) }} mm.
      </p>
    } @else {
      <p role="status">
        Unmeasured or incomplete: each added reading needs a positive value;
        excluded readings need a reason. Reset clears this set.
      </p>
    }
    <p class="help">
      Same nominal size, orientation, measuring direction and process only.
      Range describes recorded spread, not uncertainty. Excluded values remain
      in your worksheet.
    </p>
  </fieldset>`,
  styles: `
    fieldset {
      min-width: 0;
      margin: 1rem 0;
      padding: 1rem;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
    }
    legend {
      font-weight: 700;
    }
    .reading {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    label {
      display: grid;
      gap: 0.3rem;
      min-width: 0;
    }
    input {
      width: 100%;
      box-sizing: border-box;
      min-height: 2.7rem;
      padding: 0.5rem;
      border: 1px solid var(--border);
      border-radius: 0.4rem;
    }
    .include {
      display: flex;
      align-items: center;
    }
    .include input {
      width: 1rem;
    }
    .help {
      font-size: 0.9rem;
    }
  `,
})
export class RepeatReadings {
  readonly label = input.required<string>();
  readonly readings = model<readonly Reading[]>([emptyReading()]);
  readonly summary = computed(() => summarizeReadings(this.readings()));
  add(): void {
    if (this.readings().length < 20) {
      this.readings.update((readings) => [...readings, emptyReading()]);
    }
  }
  removeEmpty(index: number): void {
    const reading = this.readings()[index];
    if (index > 0 && reading && reading.value === null && !reading.reason) {
      this.readings.update((readings) =>
        readings.filter((_, i) => i !== index),
      );
    }
  }
  private update(index: number, patch: Partial<Reading>): void {
    this.readings.update((readings) =>
      readings.map((reading, i) =>
        i === index ? { ...reading, ...patch } : reading,
      ),
    );
  }
  setValue(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.update(index, { value: value.trim() === '' ? null : Number(value) });
  }
  include(index: number, event: Event): void {
    this.update(index, {
      included: (event.target as HTMLInputElement).checked,
    });
  }
  reason(index: number, event: Event): void {
    this.update(index, { reason: (event.target as HTMLInputElement).value });
  }
  format(value: number): string {
    return value.toFixed(3);
  }
}
