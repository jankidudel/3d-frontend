import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { Component, computed, inject, signal } from '@angular/core';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import {
  analyseOverhangs,
  compareOverhangOrientations,
  OverhangReport,
  validOverhangThreshold,
} from '../shared/overhang/overhang-analysis';
import { createOverhangHeatmap } from '../shared/overhang/overhang-heatmap';
import {
  resolveThreeMfWallGeometry,
  ResolvedThreeMfGeometry,
} from '../shared/wall-thickness/three-mf-wall-thickness';

@Component({
  selector: 'app-three-mf-overhang-page',
  imports: [ObjectViewerComponent],
  template: `<main class="page tool-page wall-thickness-page">
    <p class="eyebrow">3MF printability check</p>
    <h1>3MF Overhang Checker</h1>
    <p class="lead">
      Resolve the complete 3MF print build, including repeated items and
      transforms, then review downward-facing geometry locally.
    </p>
    <section class="card viewer-tool">
      <h2>Check your 3MF build</h2>
      <div class="drop-zone">
        <p>Choose a 3MF file to resolve and analyse locally.</p>
        <button class="button" type="button" (click)="openPicker(picker)">
          Choose 3MF file
        </button>
        <input
          #picker
          type="file"
          accept=".3mf"
          aria-label="Choose 3MF file"
          (change)="pick($event)"
        />
      </div>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </section>
    @if (resolved(); as model) {
      <section class="card">
        <h2>Orientation and threshold</h2>
        <p>
          Declared unit: {{ model.declaredUnit }} · resolved build:
          {{ model.buildItemCount }} build items and
          {{ model.resolvedMeshCount }} mesh instances.
        </p>
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
          horizontal surface. Slicers make the final support decision. Resin
          support needs also depend on orientation, peel forces and drainage.
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
        <dl class="metrics">
          <div>
            <dt>Flagged triangles</dt>
            <dd>{{ result.flaggedCount.toLocaleString() }}</dd>
          </div>
          <div>
            <dt>Flagged surface area</dt>
            <dd>{{ result.flaggedArea.toFixed(2) }} mm²</dd>
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
            [extent]="resolved()!.extent"
            [preserveVertexColors]="true"
            ariaLabel="3MF overhang risk heatmap"
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
              >: {{ candidate.report.flaggedArea.toFixed(2) }} mm²,
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
          <a [href]="routeUrl.ThreeMfPrintPreflight">3MF Print Preflight</a> ·
          <a [href]="routeUrl.ThreeMfQualityCheck">3MF Quality Checker</a> ·
          <a [href]="routeUrl.ThreeMfWallThicknessChecker"
            >3MF Wall Thickness Checker</a
          >
          ·
          <a [href]="routeUrl.ThreeMfDimensionsChecker"
            >3MF Dimensions Checker</a
          >
          ·
          <a [href]="guideRouteUrl.Route3dPrintOverhangsAndSupportsGuide"
            >Overhangs and Supports Guide</a
          >
        </p>
      </section>
    }
    <section class="content">
      <h2>Build transforms come before the angle check</h2>
      <p>
        This page resolves the supported 3MF build locally, including repeated
        instances and component placements, before examining oriented triangle
        normals. It uses the complete combined build rather than a selectable
        single resource. A rotated instance can therefore produce different
        downward-facing triangles from its unplaced mesh definition. Declared
        units determine physical area, while uniform unit conversion does not
        change face angles.
      </p>
      <p>
        The default build direction is positive Z; downward faces have a slope
        measured from vertical. A downward horizontal underside is 90° and a
        vertical wall is 0°. The threshold comparison is strict: slope must
        exceed the selected angle. Rotating the build direction changes the
        question; it does not modify or export a new slicer project.
      </p>
      <p>
        Open the declared-inch example in the viewer to confirm its 25.4 mm
        spans and transformed placement, then inspect the same build here.
        Translation alone must not change face slopes. A profile label is a
        starting review aid, not verification of resin supports or a particular
        FDM material. Unsupported or unresolved packages stop with an error;
        colour, printer settings and private project data are not interpreted as
        support instructions.
      </p>
      <p>
        Check build-item count, winding and highlighted undersides before
        accepting a low flagged percentage. It cannot prove adhesion, strength
        or absence of bridging problems. Return to the actual receiving slicer
        for support locations and layer preview, especially if the imported
        build orientation differs.
      </p>
    </section>
  </main>`,
  styleUrl: '../stl-wall-thickness/stl-wall-thickness-page.scss',
})
export class ThreeMfOverhangPage {
  readonly routeUrl = PublicRouteUrl;
  readonly guideRouteUrl = GuideRouteUrl;
  readonly resolved = signal<ResolvedThreeMfGeometry | null>(null);
  readonly error = signal('');
  readonly threshold = signal(45);
  readonly profile = signal('FDM');
  readonly report = signal<OverhangReport | null>(null);
  readonly valid = computed(() => validOverhangThreshold(this.threshold()));
  readonly heatmap = computed(() =>
    this.resolved() && this.report()
      ? createOverhangHeatmap(this.resolved()!.geometry, this.report()!)
      : null,
  );
  readonly comparisons = computed(() =>
    this.resolved() && this.report()
      ? compareOverhangOrientations(this.resolved()!.geometry, this.threshold())
      : [],
  );
  private readonly seo = inject(SeoService);
  constructor() {
    this.seo.apply({
      title: '3MF Overhang Checker - Review Support Risk | InspectMesh',
      description:
        'Check resolved 3MF-build downward-facing geometry and compare 90-degree orientations locally before slicing.',
      path: PublicRouteUrl.ThreeMfOverhangChecker,
    });
  }
  openPicker(input: HTMLInputElement): void {
    input.click();
  }
  async pick(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.item(0);
    this.error.set('');
    this.resolved.set(null);
    this.report.set(null);
    if (!file) {
      return;
    }
    if (
      !file.name.toLowerCase().endsWith('.3mf') ||
      file.size === 0 ||
      file.size > getMaxFileUploadSizeLimit()
    ) {
      this.error.set('Choose a non-empty 3MF file up to 25 MiB.');
      return;
    }
    try {
      this.resolved.set(
        await resolveThreeMfWallGeometry(await file.arrayBuffer()),
      );
    } catch {
      this.error.set('We could not resolve this 3MF build locally.');
    }
  }
  analyse(): void {
    const geometry = this.resolved()?.geometry;
    if (geometry && this.valid()) {
      this.report.set(analyseOverhangs(geometry, this.threshold()));
    }
  }
  headline(result: OverhangReport): string {
    return result.flaggedPercentage > 30
      ? 'Large unsupported downward-facing area'
      : result.flaggedCount
        ? 'Overhangs to review before slicing'
        : 'Low overhang risk at this threshold';
  }
}
