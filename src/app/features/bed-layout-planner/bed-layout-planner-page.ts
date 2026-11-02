import { PrinterProfileEditor } from '../../shared/printer-profile-editor';
import { PrinterFitControls } from '../../shared/printer-fit-controls';
import { ModelUnit, convertLength } from '../../shared/model-dimensions';
import { Router } from '@angular/router';
import {
  JobPlanningSession,
  PlanningDestination,
} from '../planning/job-planning-session';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import {
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import {
  BedShape,
  printerProfileMm,
  PrinterProfileService,
} from '../../core/printer/printer-profile.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { readStl } from '../stl-reducer/stl-reducer';
import { resolveThreeMfWallGeometry } from '../shared/wall-thickness/three-mf-wall-thickness';
import { BedPart, planBedLayout, MAX_LAYOUT_PARTS } from './bed-layout';

@Component({
  selector: 'app-bed-layout-planner-page',
  imports: [PrinterProfileEditor, RouterLink],
  templateUrl: './bed-layout-planner-page.html',
  styleUrl: './bed-layout-planner-page.scss',
})
export class BedLayoutPlannerPage {
  private readonly session = inject(JobPlanningSession);
  private readonly router = inject(Router);
  readonly countConfirmed = linkedSignal(() => {
    this.plan();
    this.profile();
    this.stlUnit();
    this.useSaved();
    return false;
  });
  async offerCost(): Promise<void> {
    if (
      !this.countConfirmed() ||
      !this.plan().available ||
      this.loading() ||
      !this.plan().placed.length
    ) {
      return;
    }
    this.session.offer({
      destination: PlanningDestination.Cost,
      value: this.plan().placed.length,
      basis: `User-confirmed accepted unsliced placements: ${this.plan().placed.length}; ${this.bed()?.shape} region; edge ${this.margin()} mm; expanded-envelope gap ${this.gap()} mm; extra XY ${this.expansion()} mm per side. Not successful production or generated consumption/time. Enter actual slicer values.`,
    });
    await this.router.navigateByUrl(PublicRouteUrl.PrintCostCalculator);
  }
  readonly guideRouteUrl = GuideRouteUrl;
  readonly routeUrl = PublicRouteUrl;
  readonly bedShapes = BedShape;
  readonly parts = signal<readonly (BedPart & { isStl?: boolean })[]>([]);
  readonly margin = signal(5);
  readonly error = signal('');
  readonly loading = signal(false);
  private readonly printers = inject(PrinterProfileService);
  readonly profile = computed(() => this.printers.profile());
  readonly printerControls = new PrinterFitControls(this.printers);
  readonly useSaved = signal(!!this.profile() || this.printers.needsReview());
  readonly stlUnit = signal<ModelUnit>('mm');
  readonly gap = signal(5);
  readonly expansion = signal(0);
  readonly bed = computed(() => {
    const p = this.useSaved() ? this.profile() : this.printerControls.draft();
    return p ? printerProfileMm(p) : null;
  });
  readonly convertedParts = computed(() =>
    this.parts().map((p) => {
      const from = p.isStl ? this.stlUnit() : 'mm';
      return {
        ...p,
        width: convertLength(p.width, from, 'mm'),
        depth: convertLength(p.depth, from, 'mm'),
        z: p.z === undefined ? undefined : convertLength(p.z, from, 'mm'),
      };
    }),
  );
  readonly plan = computed(() => {
    const b = this.bed();
    return planBedLayout(
      this.convertedParts(),
      b?.x ?? NaN,
      b?.y ?? NaN,
      this.margin(),
      {
        shape: b?.shape,
        gap: this.gap(),
        expansion: this.expansion(),
        usableZ: b?.z,
      },
    );
  });
  readonly bedUse = computed(() => {
    const b = this.bed(),
      e = this.margin(),
      plan = this.plan();
    const area = b
      ? b.shape === BedShape.Circular
        ? Math.PI * (b.x / 2 - e) ** 2
        : (b.x - 2 * e) * (b.y - 2 * e)
      : 0;
    const reserved = plan.placed.reduce(
      (total, p) => total + p.width * p.depth,
      0,
    );
    const models = plan.placed.reduce(
      (total, p) => total + p.modelWidth * p.modelDepth,
      0,
    );
    return {
      percentage: area > 0 ? (reserved / area) * 100 : 0,
      modelPercentage: area > 0 ? (models / area) * 100 : 0,
    };
  });
  private readonly seo = inject(SeoService);
  constructor() {
    if (!this.profile() && !this.printers.needsReview()) {
      this.printerControls.buildWidth.set(220);
      this.printerControls.buildHeight.set(220);
      this.printerControls.buildDepth.set(250);
    }
    this.seo.apply({
      title: '3D Print Bed Layout Planner - Arrange STL and 3MF Parts',
      description:
        'Arrange multiple STL and 3MF model footprints on a saved 3D printer bed locally, with spacing and simple batch planning.',
      path: PublicRouteUrl.BedLayoutPlanner,
    });
  }
  openPicker(input: HTMLInputElement): void {
    input.click();
  }
  private fileRevision = 0;
  async chooseFiles(event: Event): Promise<void> {
    const revision = ++this.fileRevision;
    this.countConfirmed.set(false);
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    this.error.set('');
    if (!files.length) {
      return;
    }
    if (files.length + this.parts().length > MAX_LAYOUT_PARTS) {
      this.error.set(
        `Choose at most ${MAX_LAYOUT_PARTS} parts in this planning session.`,
      );
      return;
    }
    if (
      files.some(
        (file) =>
          !/\.(stl|3mf)$/i.test(file.name) ||
          !file.size ||
          file.size > getMaxFileUploadSizeLimit(),
      )
    ) {
      this.error.set('Choose non-empty STL or 3MF files up to 25 MiB.');
      return;
    }
    this.loading.set(true);
    try {
      const parts = await Promise.all(
        files.map(async (file) => {
          const geometry = file.name.toLowerCase().endsWith('.stl')
            ? await readStl(file)
            : (await resolveThreeMfWallGeometry(await file.arrayBuffer()))
                .geometry;
          const points = geometry.positions;
          let minZ = Infinity,
            maxZ = -Infinity;
          let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
          for (let index = 0; index < points.length; index += 3) {
            minZ = Math.min(minZ, points[index + 2]!);
            maxZ = Math.max(maxZ, points[index + 2]!);
            minX = Math.min(minX, points[index]!);
            maxX = Math.max(maxX, points[index]!);
            minY = Math.min(minY, points[index + 1]!);
            maxY = Math.max(maxY, points[index + 1]!);
          }
          return {
            name: file.name,
            width: maxX - minX,
            depth: maxY - minY,
            z: maxZ - minZ,
            isStl: file.name.toLowerCase().endsWith('.stl'),
          };
        }),
      );
      if (revision !== this.fileRevision) {
        return;
      }
      this.parts.update((current) => [...current, ...parts]);
    } catch {
      if (revision !== this.fileRevision) {
        return;
      }
      this.error.set('One or more files could not be read locally.');
    } finally {
      if (revision === this.fileRevision) {
        this.loading.set(false);
      }
    }
  }
  setMargin(event: Event): void {
    this.countConfirmed.set(false);
    const value = Number((event.target as HTMLInputElement).value);
    this.margin.set(value);
  }
  clear(): void {
    this.fileRevision++;
    this.loading.set(false);
    this.countConfirmed.set(false);
    this.parts.set([]);
  }
  format(value: number): string {
    return value.toFixed(1);
  }
}
