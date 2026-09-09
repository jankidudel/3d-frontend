import { Component, computed, inject, signal } from '@angular/core';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { readStl, StlMesh } from '../stl-reducer/stl-reducer';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import {
  analyseOverhangs,
  compareOverhangOrientations,
  OverhangReport,
  validOverhangThreshold,
} from '../shared/overhang/overhang-analysis';
import { createOverhangHeatmap } from '../shared/overhang/overhang-heatmap';

@Component({
  selector: 'app-stl-overhang-page',
  imports: [ObjectViewerComponent],
  template: `<main class="page tool-page wall-thickness-page">
    <p class="eyebrow">STL printability check</p>
    <h1>STL Overhang Checker</h1>
    <p class="lead">
      Find downward-facing STL geometry that exceeds a review threshold, locally
      in your browser.
    </p>
    <section class="card">
      <h2>Check your STL</h2>
      <button class="button" type="button" (click)="picker.click()">
        Choose STL file</button
      ><input
        #picker
        type="file"
        accept=".stl"
        aria-label="Choose STL file"
        (change)="pick($event)"
      />
      <p class="hint">
        STL does not store units. Angle analysis is based on geometry direction,
        not scale.
      </p>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </section>
    @if (mesh()) {
      <section class="card">
        <h2>Orientation and threshold</h2>
        <label
          >Process profile
          <select
            [value]="profile()"
            (change)="profile.set($any($event.target).value)"
          >
            <option value="FDM">FDM starting profile</option>
            <option value="Resin">Resin orientation review</option>
          </select></label
        ><label
          >Flag surfaces steeper than this angle from vertical
          <input
            type="number"
            min="0"
            max="89.9"
            step="0.1"
            [value]="threshold()"
            (input)="
              threshold.set(+$any($event.target).value); report.set(null)
            "
          />
          degrees</label
        >
        <p>
          0 degrees means a vertical wall; 90 degrees means a downward-facing
          horizontal surface.
          {{
            profile() === 'FDM'
              ? '45 degrees is a starting point only: printer, nozzle, cooling, material, layer height and speed matter.'
              : 'For resin, use this as an orientation and support-risk screen, not a universal support rule.'
          }}
        </p>
        <button
          class="button"
          type="button"
          [disabled]="!valid()"
          (click)="analyse()"
        >
          Analyse overhang risk
        </button>
      </section>
    }
    @if (report(); as result) {
      <section class="card result">
        <h2>{{ headline(result) }}</h2>
        <p>Slicers make the final support decision.</p>
        <dl class="metrics">
          <div>
            <dt>Flagged triangles</dt>
            <dd>{{ result.flaggedCount.toLocaleString() }}</dd>
          </div>
          <div>
            <dt>Flagged surface area</dt>
            <dd>{{ result.flaggedArea.toFixed(2) }}</dd>
          </div>
          <div>
            <dt>Flagged surface</dt>
            <dd>{{ result.flaggedPercentage.toFixed(1) }}%</dd>
          </div>
        </dl>
        <p class="legend">
          Heatmap legend: red faces exceed the selected overhang threshold; teal
          faces are not flagged.
        </p>
        @if (heatmap(); as display) {
          <app-object-viewer
            [object]="display"
            [extent]="extent()"
            [preserveVertexColors]="true"
            ariaLabel="STL overhang risk heatmap"
          />
        }
      </section>
      <section class="card">
        <h2>90-degree rotation comparison</h2>
        <p>
          This rotation reduces geometry flagged by the selected overhang
          threshold. Review strength, visible surfaces, support access and
          printer fit before choosing it.
        </p>
        <ul>
          @for (candidate of comparisons(); track candidate.label) {
            <li>
              <strong>{{ candidate.label }}</strong
              >: {{ candidate.report.flaggedArea.toFixed(2) }} area,
              {{ candidate.report.flaggedPercentage.toFixed(1) }}% flagged
            </li>
          }
        </ul>
      </section>
      <section class="card">
        <h2>Important limitations</h2>
        <p>
          This is geometry screening, not a slicer. It cannot reliably identify
          bridges, calculate support volume or guarantee support-free printing.
          Mesh errors, printer, material and slicer settings change real-world
          results.
        </p>
        <p>
          <a href="/stl-print-preflight">STL Print Preflight</a> ·
          <a href="/stl-quality-checker">STL Quality Checker</a> ·
          <a href="/stl-wall-thickness-checker">STL Wall Thickness Checker</a> ·
          <a href="/stl-dimensions-checker">STL Dimensions Checker</a> ·
          <a href="/stl-splitter">STL Splitter</a> ·
          <a href="/3d-print-overhangs-and-supports-guide"
            >Overhangs and Supports Guide</a
          >
        </p>
      </section>
    }
  </main>`,
  styleUrl: '../stl-wall-thickness/stl-wall-thickness-page.scss',
})
export class StlOverhangPage {
  readonly mesh = signal<StlMesh | null>(null);
  readonly error = signal('');
  readonly threshold = signal(45);
  readonly profile = signal('FDM');
  readonly report = signal<OverhangReport | null>(null);
  readonly valid = computed(() => validOverhangThreshold(this.threshold()));
  readonly heatmap = computed(() =>
    this.mesh() && this.report()
      ? createOverhangHeatmap(this.mesh()!, this.report()!)
      : null,
  );
  readonly comparisons = computed(() =>
    this.mesh() && this.report()
      ? compareOverhangOrientations(this.mesh()!, this.threshold())
      : [],
  );
  private readonly seo = inject(SeoService);
  constructor() {
    this.seo.apply({
      title: 'STL Overhang Checker - Review Support Risk | InspectMesh',
      description:
        'Check STL downward-facing geometry and compare 90-degree orientations locally before slicing.',
      path: PublicRouteUrl.StlOverhangChecker,
    });
  }
  async pick(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.item(0);
    this.error.set('');
    this.mesh.set(null);
    this.report.set(null);
    if (!file) {
      return;
    }
    if (
      !file.name.toLowerCase().endsWith('.stl') ||
      file.size === 0 ||
      file.size > getMaxFileUploadSizeLimit()
    ) {
      this.error.set('Choose a non-empty STL file up to 25 MiB.');
      return;
    }
    try {
      this.mesh.set(await readStl(file));
    } catch {
      this.error.set('We could not read that STL file.');
    }
  }
  analyse(): void {
    const mesh = this.mesh();
    if (mesh && this.valid()) {
      this.report.set(analyseOverhangs(mesh, this.threshold()));
    }
  }
  extent(): number {
    const values = this.mesh()?.positions ?? [];
    return values.length ? Math.max(...values) - Math.min(...values) : 1;
  }
  headline(result: OverhangReport): string {
    return result.flaggedPercentage > 30
      ? 'Large unsupported downward-facing area'
      : result.flaggedCount
        ? 'Overhangs to review before slicing'
        : 'Low overhang risk at this threshold';
  }
}
