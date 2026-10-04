import { ToolEvidenceComponent } from '../repeat-workflows/tool-evidence';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PrinterProfileService } from '../../core/printer/printer-profile.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { ModelUnit } from '../../shared/model-dimensions';
import { readStl } from '../stl-reducer/stl-reducer';
import { IndexedTriangleGeometry } from '../shared/wall-thickness/wall-thickness-analysis';
import { resolveThreeMfWallGeometry } from '../shared/wall-thickness/three-mf-wall-thickness';
import { planOrientations } from './orientation-planner-analysis';

type ModelFormat = 'stl' | '3mf';

@Component({
  selector: 'app-orientation-planner-page',
  imports: [ToolEvidenceComponent, RouterLink],
  templateUrl: './orientation-planner-page.html',
  styleUrl: './orientation-planner-page.scss',
})
export class OrientationPlannerPage {
  readonly routeUrl = PublicRouteUrl;
  readonly mesh = signal<IndexedTriangleGeometry | null>(null);
  readonly format = signal<ModelFormat | null>(null);
  readonly stlUnit = signal<ModelUnit>('mm');
  readonly threshold = signal(45);
  readonly error = signal('');
  readonly progress = signal('');
  readonly analysing = signal(false);
  private readonly printerProfiles = inject(PrinterProfileService);
  readonly printerProfile = computed(() => this.printerProfiles.profile());
  readonly plans = computed(() => {
    const mesh = this.mesh();
    if (!mesh) {
      return [];
    }
    return planOrientations(
      mesh,
      this.threshold(),
      this.format() === '3mf' ? 'mm' : this.stlUnit(),
      this.printerProfile(),
    );
  });
  readonly recommended = computed(() => this.plans()[0] ?? null);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: '3D Print Orientation Planner - Compare STL and 3MF Orientations',
      description:
        'Compare sensible STL and 3MF print orientations locally for printer fit, downward-facing overhang risk and estimated bed contact before slicing.',
      path: PublicRouteUrl.OrientationPlanner,
    });
  }

  openPicker(input: HTMLInputElement): void {
    input.click();
  }

  async chooseFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.item(0);
    this.mesh.set(null);
    this.format.set(null);
    this.error.set('');
    this.progress.set('');
    if (!file) {
      return;
    }
    const name = file.name.toLowerCase();
    const format: ModelFormat | null = name.endsWith('.stl')
      ? 'stl'
      : name.endsWith('.3mf')
        ? '3mf'
        : null;
    if (!format || file.size === 0 || file.size > getMaxFileUploadSizeLimit()) {
      this.error.set('Choose a non-empty STL or 3MF file up to 25 MiB.');
      return;
    }
    this.analysing.set(true);
    try {
      this.progress.set(
        format === 'stl'
          ? 'Reading STL geometry locally…'
          : 'Resolving 3MF build geometry locally…',
      );
      const mesh =
        format === 'stl'
          ? await readStl(file)
          : (await resolveThreeMfWallGeometry(await file.arrayBuffer()))
              .geometry;
      this.mesh.set(mesh);
      this.format.set(format);
      this.progress.set('Orientation comparison ready.');
    } catch {
      this.error.set(
        format === 'stl'
          ? 'We could not read that STL file.'
          : 'We could not resolve that 3MF build locally. Choose a standard, unencrypted mesh-based 3MF file.',
      );
    } finally {
      this.analysing.set(false);
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

  formatNumber(value: number): string {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}
