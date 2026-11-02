import { PrinterProfileEditor } from '../../shared/printer-profile-editor';
import { PrinterFitControls } from '../../shared/printer-fit-controls';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PrinterProfileService } from '../../core/printer/printer-profile.service';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { ModelUnit } from '../../shared/model-dimensions';
import { ExampleLoader } from '../examples/example-loader';
import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-analysis';
import {
  resolveThreeMfWallGeometry,
  ResolvedThreeMfGeometry,
} from '../shared/wall-thickness/three-mf-wall-thickness';
import { readStl } from '../stl-reducer/stl-reducer';
import { planOrientations } from './orientation-planner-analysis';

export const OrientationModelFormat = {
  Stl: 'stl',
  ThreeMf: '3mf',
} as const;

export type OrientationModelFormat =
  (typeof OrientationModelFormat)[keyof typeof OrientationModelFormat];

@Component({
  selector: 'app-orientation-planner-page',
  imports: [
    PrinterProfileEditor,
    ExampleLoader,
    ToolEvidenceComponent,
    RouterLink,
  ],
  templateUrl: './orientation-planner-page.html',
  styleUrl: './orientation-planner-page.scss',
})
export class OrientationPlannerPage {
  readonly guideRouteUrl = GuideRouteUrl;
  readonly routeUrl = PublicRouteUrl;
  readonly mesh = signal<IndexedTriangleGeometry | null>(null);
  readonly format = signal<OrientationModelFormat | null>(null);
  readonly resolvedThreeMf = signal<ResolvedThreeMfGeometry | null>(null);
  readonly stlUnit = signal<ModelUnit>('mm');
  readonly threshold = signal(45);
  readonly edgeAllowance = signal(0);
  readonly selectedPlanId = signal('positive-z');
  readonly error = signal('');
  readonly progress = signal('');
  readonly analysing = signal(false);
  private fileRevision = 0;
  private readonly printerProfiles = inject(PrinterProfileService);
  readonly printerControls = new PrinterFitControls(this.printerProfiles);
  readonly expansion = signal(0);
  readonly printerProfile = computed(() => this.printerProfiles.profile());
  readonly plans = computed(() => {
    const mesh = this.mesh();
    if (!mesh) {
      return [];
    }
    return planOrientations(
      mesh,
      this.threshold(),
      this.format() === OrientationModelFormat.ThreeMf ? 'mm' : this.stlUnit(),
      this.printerProfile(),
      this.edgeAllowance(),
      this.expansion(),
    );
  });
  readonly selectedPlan = computed(
    () =>
      this.plans().find((plan) => plan.id === this.selectedPlanId()) ??
      this.plans()[0] ??
      null,
  );
  readonly largestContactArea = computed(() =>
    this.plans().reduce(
      (largest, plan) => Math.max(largest, plan.bedContactArea),
      0,
    ),
  );
  readonly sourcePlan = computed(() => this.plans()[0] ?? null);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: '3D Print Orientation Planner - Compare STL and 3MF Orientations',
      description:
        'Compare six axis-aligned STL and 3MF orientations locally for envelope fit, downward-facing area and estimated coplanar bed contact before slicing.',
      path: PublicRouteUrl.OrientationPlanner,
    });
  }

  openPicker(input: HTMLInputElement): void {
    input.click();
  }

  async chooseFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.item(0);
    if (file) {
      await this.loadFile(file);
    }
  }

  readonly loadExample = async (files: readonly File[]): Promise<void> => {
    const file = files[0];
    if (file) {
      await this.loadFile(file);
    }
  };

  private async loadFile(file: File): Promise<void> {
    const revision = ++this.fileRevision;
    this.mesh.set(null);
    this.format.set(null);
    this.resolvedThreeMf.set(null);
    this.error.set('');
    this.progress.set('');
    const name = file.name.toLowerCase();
    const format: OrientationModelFormat | null = name.endsWith('.stl')
      ? OrientationModelFormat.Stl
      : name.endsWith('.3mf')
        ? OrientationModelFormat.ThreeMf
        : null;
    if (!format || file.size === 0 || file.size > getMaxFileUploadSizeLimit()) {
      this.error.set('Choose a non-empty STL or 3MF file up to 25 MiB.');
      return;
    }
    this.analysing.set(true);
    try {
      this.progress.set(
        format === OrientationModelFormat.Stl
          ? 'Reading STL geometry locally…'
          : 'Resolving 3MF build geometry locally…',
      );
      const resolved =
        format === OrientationModelFormat.ThreeMf
          ? await resolveThreeMfWallGeometry(await file.arrayBuffer())
          : null;
      const mesh = resolved?.geometry ?? (await readStl(file));
      if (revision !== this.fileRevision) {
        return;
      }
      this.resolvedThreeMf.set(resolved);
      this.format.set(format);
      this.mesh.set(mesh);
      this.selectedPlanId.set('positive-z');
      this.progress.set('Orientation comparison ready.');
    } catch {
      if (revision !== this.fileRevision) {
        return;
      }
      this.error.set(
        format === OrientationModelFormat.Stl
          ? 'We could not read that STL file.'
          : 'We could not resolve that 3MF build locally. Choose a standard, unencrypted mesh-based 3MF file.',
      );
    } finally {
      if (revision === this.fileRevision) {
        this.analysing.set(false);
      }
    }
  }

  setThreshold(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value) && value >= 0 && value < 90) {
      this.threshold.set(value);
    }
  }

  setStlUnit(event: Event): void {
    this.stlUnit.set((event.target as HTMLSelectElement).value as ModelUnit);
  }

  setEdgeAllowance(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.edgeAllowance.set(value);
  }

  selectPlan(id: string): void {
    this.selectedPlanId.set(id);
  }

  formatNumber(value: number): string {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  areaUnit(): string {
    return this.format() === OrientationModelFormat.ThreeMf
      ? 'mm²'
      : `${this.stlUnit()}²`;
  }
}
