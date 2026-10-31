import {
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  MeasurementFormat,
  MeasurementContext,
  MeasurementEntry,
  MeasurementPoint,
  MeasurementPolicy,
  MeasurementState,
  MeasurementType,
  SelectionBasis,
  LengthUnit,
  createMeasurementEntry,
  serializeMeasurements,
  unitToMm,
} from './measurement';
@Component({
  selector: 'app-measurement-panel',
  templateUrl: './measurement-panel.html',
  styleUrl: './measurement-panel.scss',
})
export class MeasurementPanel {
  readonly context = input.required<MeasurementContext>();
  readonly assumption = input('');
  readonly changed = output<void>();
  readonly active = signal(false);
  readonly type = signal<MeasurementType>(MeasurementType.Distance);
  readonly basis = signal<SelectionBasis>(SelectionBasis.Surface);
  readonly points = signal<readonly MeasurementPoint[]>([]);
  readonly candidates = signal<readonly MeasurementPoint[]>([]);
  readonly entries = signal<readonly MeasurementEntry[]>([]);
  readonly name = signal('');
  readonly displayUnit = signal<string>(LengthUnit.Mm);
  readonly notice = signal(
    'Select a type, start measuring, then choose points on the model.',
  );
  readonly confirmClear = signal(false);
  readonly formats = MeasurementFormat;
  readonly types = MeasurementType;
  readonly bases = SelectionBasis;
  readonly states = MeasurementState;
  readonly policy = MeasurementPolicy;
  readonly basisLabels = {
    [SelectionBasis.Surface]: 'Surface point',
    [SelectionBasis.Vertex]: 'Mesh vertex',
    [SelectionBasis.Entered]: 'Entered coordinates',
  };
  readonly requiredCount = computed(() =>
    this.type() === MeasurementType.Distance ? 2 : 3,
  );
  readonly current = computed(() =>
    this.points().length === this.requiredCount()
      ? createMeasurementEntry(
          'current',
          this.name(),
          this.type(),
          this.points(),
          this.context(),
          this.assumption(),
          this.displayUnit(),
        )
      : null,
  );
  private nextId = 1;
  constructor() {
    let previous: string | null = null;
    effect(() => {
      const assumption = this.assumption();
      const context = this.context();
      const display = this.displayUnit();
      if (previous !== null && previous !== assumption) {
        this.notice.set(
          'STL coordinate interpretation changed. Physical lengths have been recomputed from retained source coordinates, including saved entries.',
        );
      }
      previous = assumption;
      untracked(() =>
        this.entries.update((entries) =>
          entries.map((entry) =>
            createMeasurementEntry(
              entry.id,
              entry.name,
              entry.type,
              entry.points,
              context,
              assumption,
              display,
            ),
          ),
        ),
      );
    });
    effect(() => {
      this.points();
      this.current();
      this.candidates();
      this.changed.emit();
    });
  }
  setType(value: string): void {
    const type = Object.values(MeasurementType).find((t) => t === value);
    if (!type) {
      return;
    }
    this.type.set(type);
    this.clear();
    this.notice.set(
      'Type changed. Current points cleared; saved measurements retained. B is the vertex in Angle mode.',
    );
  }
  setBasis(value: string): void {
    const basis = Object.values(SelectionBasis).find((b) => b === value);
    if (basis) {
      this.basis.set(basis);
      this.candidates.set([]);
    }
  }
  accept(point: MeasurementPoint): void {
    if (this.points().length === this.requiredCount()) {
      this.points.set([]);
    }
    this.points.update((points) => [...points, point]);
    this.candidates.set([]);
    this.notice.set(
      this.points().length === this.requiredCount()
        ? 'Selection complete. Review the result and save it deliberately.'
        : 'Point selected. Choose the next point.',
    );
  }
  enter(x: string, y: string, z: string): void {
    if ([x, y, z].some((v) => v.trim() === '' || !Number.isFinite(Number(v)))) {
      this.notice.set('Enter three finite coordinates.');
      return;
    }
    this.accept({
      coordinates: [Number(x), Number(y), Number(z)],
      basis: SelectionBasis.Entered,
    });
  }
  clear(): void {
    this.points.set([]);
    this.candidates.set([]);
    this.name.set('');
    this.notice.set(
      'Current measurement cleared. Saved measurements retained.',
    );
  }
  undo(): void {
    this.points.update((points) => points.slice(0, -1));
    this.candidates.set([]);
  }
  save(): void {
    const entry = this.current();
    if (!entry) {
      return;
    }
    if (this.entries().length >= MeasurementPolicy.maxRecords) {
      this.notice.set(
        'The 20-measurement limit is reached. Remove an entry before saving another.',
      );
      return;
    }
    const id = `measurement-${this.nextId++}`;
    this.entries.update((entries) => [
      ...entries,
      {
        ...entry,
        id,
        name: this.name().trim() || `${this.type()} ${this.nextId - 1}`,
      },
    ]);
    this.notice.set(
      'Saved in this tab only. Download JSON to retain the record.',
    );
  }
  review(entry: MeasurementEntry): void {
    this.type.set(entry.type);
    this.points.set(entry.points);
    this.name.set(entry.name);
    this.candidates.set([]);
    this.notice.set(
      'Reviewing saved points in their original source/build frame. Hidden items remain hidden; markers identify the recorded locations.',
    );
  }
  rename(id: string, name: string): void {
    this.entries.update((entries) =>
      entries.map((e) =>
        e.id === id
          ? { ...e, name: name.slice(0, MeasurementPolicy.maxNameLength) }
          : e,
      ),
    );
  }
  remove(id: string): void {
    this.entries.update((entries) => entries.filter((e) => e.id !== id));
  }
  clearAll(): void {
    this.entries.set([]);
    this.clear();
    this.confirmClear.set(false);
  }
  resetForFile(): void {
    this.clearAll();
    this.nextId = 1;
    this.active.set(false);
  }
  download(): void {
    const blob = new Blob([serializeMeasurements(this.entries())], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'measurements.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  length(value: number | undefined): string {
    if (value === undefined) {
      return 'Unavailable';
    }
    const entry = this.current();
    const factor = entry?.coordinateToMm;
    const converted =
      factor == null
        ? value
        : (value * factor) / (unitToMm(this.displayUnit()) ?? 1);
    return `${this.number(converted)} ${factor == null ? 'coordinate units (physical length unavailable)' : this.displayUnit()}`;
  }
  number(value: number): string {
    return new Intl.NumberFormat('en', { maximumSignificantDigits: 9 }).format(
      value,
    );
  }
  pointLabel(index: number): string {
    return index === 1 && this.type() === MeasurementType.Angle
      ? 'B (angle vertex)'
      : String.fromCharCode(65 + index);
  }
}
