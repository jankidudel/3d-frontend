import { ExampleAsset } from '../examples/example-assets';
import {
  JobPlanningSession,
  PlanningDestination,
} from './job-planning-session';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AnalyticsService,
  AnalyticsEvent,
} from '../../core/analytics/analytics.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import {
  FILAMENT_PRESETS,
  FilamentPreset,
} from '../filament-length-calculator/filament-length-calculator';
import {
  spoolSufficiency,
  wallPlan,
  volumetricPlan,
  finishTime,
  zonedStart,
  localNow,
  TimeOccurrence,
} from './planning-calculations';
import {
  ProductLinkComponent,
  ProductRecords,
} from '../repeat-workflows/product-link';

import { PlannerKind } from './planner-kind';
const Field = {
  Gross: 'gross',
  Tare: 'tare',
  Reserve: 'reserve',
  Job: 'job',
  Diameter: 'diameter',
  Density: 'density',
  Nozzle: 'nozzle',
  Width: 'width',
  Wall: 'wall',
  Layer: 'layer',
  Speed: 'speed',
  Limit: 'limit',
  Hours: 'hours',
  Minutes: 'minutes',
  Allowance: 'allowance',
  Correction: 'correction',
} as const;
type Field = (typeof Field)[keyof typeof Field];
interface NumericField {
  key: Field;
  label: string;
  value: number;
  min: number;
}
const numeric = (
  key: Field,
  label: string,
  value: number,
  min = 0,
): NumericField => ({ key, label, value, min });
const PLANNERS = {
  [PlannerKind.Spool]: {
    title: 'Filament Remaining and Job Sufficiency Calculator',
    path: PublicRouteUrl.FilamentRemainingCalculator,
    description:
      'Weigh a partial spool, subtract its tare and reserve, then check whether you have enough filament for your next job.',
    fields: [
      numeric(Field.Gross, 'Spool plus filament (g)', 350),
      numeric(Field.Tare, 'Empty spool tare (g)', 200),
      numeric(Field.Reserve, 'Explicit reserve (g), editable', 0),
      numeric(Field.Job, 'Whole job or one complete copy (g)', 45, 0.01),
      numeric(Field.Diameter, 'Filament diameter (mm)', 1.75, 0.01),
      numeric(Field.Density, 'Density (g/cm³)', 1.24, 0.01),
    ],
    method:
      'Remaining = gross - tare. Usable = max(0, remaining - reserve). Complete copies = floor(usable / grams per copy). Approximate length uses circular filament area and the chosen density.',
    caveat:
      'Use a measured tare from the same spool type. Include supports, brim, purge and prime structures in your slicer job estimate. No brand tare preset is assumed. Scale accuracy and density affect this estimate.',
    links: [
      PublicRouteUrl.FilamentLengthCalculator,
      PublicRouteUrl.PrintCostCalculator,
    ],
    source: 'https://help.prusa3d.com/article/filament-material-guide_2222',
    product: ProductRecords.Filament,
  },
  [PlannerKind.Wall]: {
    title: 'Nozzle, Layer Height and Wall Planner',
    path: PublicRouteUrl.NozzleLayerHeightCalculator,
    description:
      'Keep nozzle diameter, extrusion line width and layer height separate. Estimate equal-width wall lines before checking the slicer preview.',
    fields: [
      numeric(Field.Nozzle, 'Nozzle diameter (mm)', 0.4, 0.01),
      numeric(Field.Width, 'Actual extrusion line width (mm)', 0.45, 0.01),
      numeric(Field.Wall, 'Intended wall thickness (mm)', 1.3, 0.01),
      numeric(Field.Layer, 'Chosen layer height (mm)', 0.2, 0.01),
    ],
    method:
      'The nearest positive whole line count is round(intended wall thickness / chosen line width); nominal thickness is line count × line width. This is equal-width line arithmetic. The 80% nozzle-diameter layer check follows Prusa starting guidance.',
    caveat:
      'This is equal-width line arithmetic. Your slicer may use variable widths, overlap and gap filling, so inspect the generated paths before choosing a wall dimension. For 1.3 mm requested and 0.45 mm chosen width, the nearest whole count is three: 1.35 mm nominal total.',
    links: [
      PublicRouteUrl.StlWallThicknessChecker,
      PublicRouteUrl.VolumetricFlowCalculator,
    ],
    source: 'https://help.prusa3d.com/article/layers-and-perimeters_1748',
    product: ProductRecords.Nozzle,
  },
  [PlannerKind.Flow]: {
    title: 'Volumetric Flow and Print Speed Calculator',
    path: PublicRouteUrl.VolumetricFlowCalculator,
    description:
      'Calculate requested extrusion throughput from actual line width, layer height and linear speed. Compare an optional measured profile limit.',
    fields: [
      numeric(Field.Width, 'Actual extrusion line width (mm)', 0.45, 0.01),
      numeric(Field.Layer, 'Layer height (mm)', 0.2, 0.01),
      numeric(Field.Speed, 'Chosen linear speed (mm/s)', 100, 0.01),
      numeric(
        Field.Limit,
        'Optional tested throughput (mm³/s), 0 = unknown',
        0,
      ),
    ],
    method:
      'Approximate Q = width × height × speed, in mm³/s. At an entered throughput, approximate speed = Q / (width × height). No throughput limit is inferred from a material or nozzle name.',
    caveat:
      'Rectangular cross-section is an approximation. A calculated speed is not a recommended machine speed: acceleration, small paths, cooling and quality can dominate. Extrusion multiplier calibration is a separate task.',
    links: [
      PublicRouteUrl.FlowRateCalculator,
      PublicRouteUrl.NozzleLayerHeightCalculator,
    ],
    source: 'https://help.prusa3d.com/article/max-volumetric-speed_127176',
    product: ProductRecords.Nozzle,
  },
  [PlannerKind.Finish]: {
    title: '3D Print Finish Time Calculator',
    path: PublicRouteUrl.PrintFinishTimeCalculator,
    description:
      'Add your slicer duration, optional setup allowance and an observed correction factor to a chosen start time. See the finish in your selected timezone.',
    fields: [
      numeric(
        Field.Hours,
        'Selected sliced duration: single or sequential runs (hours)',
        6,
      ),
      numeric(Field.Minutes, 'Additional minutes (0-59)', 30),
      numeric(
        Field.Allowance,
        'Additional elapsed time: setup/gaps/finish (minutes)',
        0,
      ),
      numeric(Field.Correction, 'Observed duration correction factor', 1, 0.01),
    ],
    method:
      'Elapsed minutes = (slicer hours × 60 + minutes) × correction factor + setup allowance. Elapsed duration is added to a resolved instant, so daylight-saving days need not have 24 local hours.',
    caveat:
      'This is a planning estimate, not printer monitoring. A previous 5-hour estimate that actually took 6 hours gives a correction factor of 1.2 for similar jobs. Do not add warm-up twice if your estimate already includes it. No accurate time is inferred from an STL.',
    links: [
      PublicRouteUrl.GcodePreflightChecker,
      PublicRouteUrl.FilamentRemainingCalculator,
      PublicRouteUrl.PrintCostCalculator,
    ],
    source:
      'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat',
    product: null,
  },
} as const;

@Component({
  selector: 'app-planning-page',
  imports: [RouterLink, DecimalPipe, ProductLinkComponent],
  templateUrl: './planning-page.html',
  styleUrl: './planning-page.scss',
})
export class PlanningPage implements OnDestroy {
  readonly exampleAsset = ExampleAsset;
  private readonly session = inject(JobPlanningSession);
  readonly guides = GuideRouteUrl;
  readonly kinds = PlannerKind;
  readonly routeUrl = PublicRouteUrl;
  readonly kind: PlannerKind = inject(ActivatedRoute).snapshot.data['planner'];
  readonly config = PLANNERS[this.kind];
  readonly pending = signal(
    this.kind === PlannerKind.Spool
      ? this.session.take(PlanningDestination.Spool)
      : this.kind === PlannerKind.Finish
        ? this.session.take(PlanningDestination.Finish)
        : null,
  );
  readonly transferBasis = signal('');
  readonly compatibilityConfirmed = signal(false);
  readonly timingConfirmed = signal(false);
  readonly values = signal<Record<string, number>>(
    Object.fromEntries(
      this.config.fields.map((field) => [field.key, field.value]),
    ),
  );
  readonly materials = Object.entries(FILAMENT_PRESETS);
  readonly material = signal<FilamentPreset>('Pla');
  readonly zone = signal('UTC');
  readonly zones = [
    'UTC',
    'Europe/London',
    'Europe/Dublin',
    'America/New_York',
    'America/Los_Angeles',
    'America/Toronto',
    'America/Vancouver',
    'Australia/Sydney',
    'Australia/Perth',
    'Pacific/Auckland',
    'Africa/Johannesburg',
  ];
  readonly start = signal('');
  readonly occurrence = signal<TimeOccurrence>(TimeOccurrence.Earlier);
  readonly occurrences = TimeOccurrence;
  readonly limitContext = signal('User-entered profile measurement');
  readonly metadata = signal('');
  readonly importError = signal('');
  private readonly analytics = inject(AnalyticsService);
  readonly spool = computed(() => {
    const v = this.values();
    return spoolSufficiency(
      v[Field.Gross],
      v[Field.Tare],
      v[Field.Reserve],
      v[Field.Job],
      v[Field.Diameter],
      v[Field.Density],
    );
  });
  readonly wall = computed(() => {
    const v = this.values();
    return wallPlan(
      v[Field.Nozzle],
      v[Field.Width],
      v[Field.Wall],
      v[Field.Layer],
    );
  });
  readonly flow = computed(() => {
    const v = this.values();
    return volumetricPlan(
      v[Field.Width],
      v[Field.Layer],
      v[Field.Speed],
      v[Field.Limit] === 0 ? null : v[Field.Limit],
    );
  });
  readonly finish = computed(() => {
    const v = this.values();
    const instant = zonedStart(this.start(), this.zone(), this.occurrence());
    return instant === null
      ? null
      : finishTime(
          instant,
          v[Field.Hours],
          v[Field.Minutes],
          v[Field.Allowance],
          v[Field.Correction],
        );
  });
  readonly valid = computed(() =>
    this.kind === PlannerKind.Spool
      ? this.spool() !== null
      : this.kind === PlannerKind.Wall
        ? this.wall() !== null
        : this.kind === PlannerKind.Flow
          ? this.flow() !== null
          : this.finish() !== null,
  );
  constructor() {
    inject(SeoService).apply({
      title: `${this.config.title} | InspectMesh`,
      description: this.config.description,
      path: this.config.path,
    });
    if (typeof window !== 'undefined') {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      this.zone.set(zone);
      if (!this.zones.includes(zone)) {
        this.zones.push(zone);
      }
      this.start.set(localNow(zone));
    }
    const draft = this.session.plannerDrafts[this.kind];
    if (draft) {
      this.values.set(draft.values);
      this.start.set(draft.start);
      this.zone.set(draft.zone);
      this.material.set(draft.material as FilamentPreset);
      this.transferBasis.set(draft.basis);
    }
  }
  ngOnDestroy(): void {
    this.importRequest++;
    this.session.plannerDrafts[this.kind] = {
      values: this.values(),
      start: this.start(),
      zone: this.zone(),
      material: this.material(),
      basis: this.transferBasis(),
    };
  }
  applyOffer(): void {
    const offer = this.pending();
    if (!offer) {
      return;
    }
    if (this.kind === PlannerKind.Spool && this.compatibilityConfirmed()) {
      this.values.update((v) => ({ ...v, [Field.Job]: offer.value }));
    } else if (this.kind === PlannerKind.Finish && this.timingConfirmed()) {
      this.values.update((v) => ({
        ...v,
        [Field.Hours]: Math.floor(offer.value),
        [Field.Minutes]: (offer.value % 1) * 60,
      }));
    } else {
      return;
    }
    this.transferBasis.set(offer.basis);
    this.pending.set(null);
  }
  setNumber(key: Field, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.values.update((values) => ({
      ...values,
      [key]: input.value === '' ? NaN : Number(input.value),
    }));
  }
  selectMaterial(event: Event): void {
    const key = (event.target as HTMLSelectElement).value as FilamentPreset;
    this.material.set(key);
    this.values.update((v) => ({
      ...v,
      [Field.Density]: FILAMENT_PRESETS[key].density,
    }));
  }
  example(): void {
    this.values.set(
      Object.fromEntries(
        this.config.fields.map((field) => [field.key, field.value]),
      ),
    );
    this.material.set('Pla');
    if (this.kind === PlannerKind.Finish) {
      this.zone.set('Europe/London');
      this.start.set('2026-10-24T23:30');
    }
    this.analytics.trackWorkflow(AnalyticsEvent.ExampleLoaded, this.kind);
    this.calculate();
  }
  calculate(): void {
    this.analytics.trackWorkflow(AnalyticsEvent.ToolStarted, this.kind);
    if (this.valid()) {
      this.analytics.trackWorkflow(AnalyticsEvent.ToolCompleted, this.kind);
    }
  }
  finishLabel(instant: number): string {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: this.zone(),
      dateStyle: 'full',
      timeStyle: 'long',
    }).format(instant);
  }
  linkLabel(path: string): string {
    return (path.split('/').at(-1) ?? '').split('-').join(' ');
  }
  private importRequest = 0;
  async importGcode(event: Event): Promise<void> {
    const request = ++this.importRequest;
    this.pending.set(null);
    this.timingConfirmed.set(false);
    this.importError.set('');
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.importError.set(
        'Choose a text G-code file under 5 MiB for metadata import. Larger files can use the dedicated G-code checker.',
      );
      return;
    }
    try {
      const { parseGcode } = await import('../gcode-preflight/gcode-parser');
      const text = await file.text();
      if (request !== this.importRequest) {
        return;
      }
      const report = parseGcode(text);
      const estimate = report.duration;
      this.metadata.set(
        estimate
          ? `Declared estimate: ${estimate.value} hours, ${estimate.scope}. Line ${estimate.line}: ${estimate.source}. Review and apply above; existing inputs remain editable.`
          : 'No supported unambiguous slicer duration declaration found. Enter it manually.',
      );
      this.timingConfirmed.set(false);
      this.pending.set(
        estimate
          ? {
              destination: PlanningDestination.Finish,
              value: estimate.value,
              basis: `G-code normal-mode duration declaration, ${report.metadata.slicer ?? 'unknown'} (unverified label). Source line ${estimate.line}: ${estimate.source}; ${estimate.scope}. No implicit warm-up or correction.`,
            }
          : null,
      );
    } catch {
      if (request !== this.importRequest) {
        return;
      }
      this.importError.set(
        'Unsupported or malformed text G-code. Enter the slicer estimate manually.',
      );
    }
  }
}
