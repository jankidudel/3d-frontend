import { Component, ElementRef, input, viewChildren } from '@angular/core';
import { PrinterFitControls } from './printer-fit-controls';
import { BedShape } from '../core/printer/printer-profile.service';
@Component({
  selector: 'app-printer-profile-editor',
  template: ` @if (controls(); as c) {
    @if (c.needsReview()) {
      <p role="status">
        <strong>Review saved printer axes.</strong> Earlier Width/Height/Depth
        labels were ambiguous. No mapping is selected. Enter the correct X/Y/Z
        and save before using this saved basis.
      </p>
      @if (c.legacy(); as old) {
        <p>
          Original stored values: Width {{ old.width }}, Height
          {{ old.height }}, Depth {{ old.depth }} {{ old.unit }}. These original
          values are preserved until you clear the profile.
        </p>
      }
    }
    <p>
      Session settings below apply to this screen. Save explicitly to share
      confirmed dimensions with other tools. Shape never follows from equal X/Y
      values.
    </p>
    <label
      >Common nominal X x Y x Z (mm)
      <select (change)="c.applyPreset($event)">
        <option value="">Choose a preset</option>
        @for (preset of c.presets; track preset.label; let i = $index) {
          <option [value]="i">{{ preset.label }}</option>
        }
      </select>
    </label>
    <label
      >Usable bed shape<select [value]="c.shape()" (change)="setShape($event)">
        <option [value]="shapes.Rectangular">Rectangle</option>
        <option [value]="shapes.Circular">Circle</option>
      </select></label
    >
    @if (c.shape() === shapes.Circular) {
      <label
        >Usable diameter<input
          type="number"
          #dimensionInput
          [attr.aria-invalid]="c.buildVolumeTouched() && !c.draft()"
          min="0"
          step="any"
          [value]="c.diameter() ?? ''"
          (input)="setDiameter($event)"
      /></label>
    } @else {
      <label
        >Usable X<input
          type="number"
          #dimensionInput
          [attr.aria-invalid]="c.buildVolumeTouched() && !c.draft()"
          min="0"
          step="any"
          [value]="c.buildWidth() ?? ''"
          (input)="c.setDimension('width', $event)"
      /></label>
      <label
        >Usable Y<input
          type="number"
          #dimensionInput
          [attr.aria-invalid]="c.buildVolumeTouched() && !c.draft()"
          min="0"
          step="any"
          [value]="c.buildHeight() ?? ''"
          (input)="c.setDimension('height', $event)"
      /></label>
    }
    <label
      >Usable Z height<input
        type="number"
        #dimensionInput
        [attr.aria-invalid]="c.buildVolumeTouched() && !c.draft()"
        min="0"
        step="any"
        [value]="c.buildDepth() ?? ''"
        (input)="c.setDimension('depth', $event)"
    /></label>
    <label
      >Dimension unit<select
        [value]="c.buildUnit()"
        (change)="c.setUnit($event)"
      >
        <option value="mm">Millimetres</option>
        <option value="cm">Centimetres</option>
        <option value="m">Metres</option>
        <option value="in">Inches</option>
      </select></label
    >
    <p>
      Changing the unit interprets the entered numbers in that unit.
      Calculations convert to millimetres. Use your documented usable region; an
      edge already excluded here need not be reserved again. Z is a height
      limit, with no inferred origin or top/bottom margin.
    </p>
    <button type="button" (click)="confirm()">
      Confirm axes and save profile
    </button>
    <button type="button" (click)="c.clear()">Forget saved profile</button>
    <p role="status">{{ c.message() }}</p>
  }`,
  styles: [
    `
      :host {
        display: block;
      }
      label {
        display: inline-flex;
        flex-direction: column;
        gap: 0.3rem;
        margin: 0.5rem 1rem 0.5rem 0;
        max-width: 100%;
      }
      input,
      select {
        max-width: 100%;
        box-sizing: border-box;
      }
      button {
        margin: 0.5rem 0.5rem 0.5rem 0;
      }
    `,
  ],
})
export class PrinterProfileEditor {
  readonly controls = input.required<PrinterFitControls>();
  readonly shapes = BedShape;
  private readonly dimensionInputs =
    viewChildren<ElementRef<HTMLInputElement>>('dimensionInput');
  confirm(): void {
    const controls = this.controls();
    controls.buildVolumeTouched.set(true);
    controls.save();
    if (!controls.draft()) {
      this.dimensionInputs()
        .find(
          ({ nativeElement }) =>
            !Number.isFinite(nativeElement.valueAsNumber) ||
            nativeElement.valueAsNumber <= 0,
        )
        ?.nativeElement.focus();
    }
  }
  setShape(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === BedShape.Rectangular || value === BedShape.Circular) {
      this.controls().shape.set(value);
    }
  }
  setDiameter(event: Event): void {
    this.controls().diameter.set(
      Number((event.target as HTMLInputElement).value),
    );
  }
}
