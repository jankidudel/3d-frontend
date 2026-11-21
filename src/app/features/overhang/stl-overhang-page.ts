import { Component, computed, inject, signal } from '@angular/core';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { ModelUnit } from '../../shared/model-dimensions';
import { ExampleLoader } from '../examples/example-loader';
import { ObjectViewerComponent } from '../shared/object-viewer/object-viewer';
import {
  analyseOverhangs,
  OVERHANG_BUILD_DIRECTIONS,
  OverhangBuildDirection,
  overhangBuildDirection,
  OverhangProcessProfile,
  OverhangReport,
  validOverhangThreshold,
} from '../shared/overhang/overhang-analysis';
import { readStl, StlMesh } from '../stl-reducer/stl-reducer';

@Component({
  selector: 'app-stl-overhang-page',
  imports: [ExampleLoader, ObjectViewerComponent],
  template: `<main class="page tool-page wall-thickness-page">
    <p class="eyebrow">STL geometry screen</p>
    <h1>STL Overhang Checker</h1>
    <p class="lead">
      Screen triangles whose oriented faces point downward and exceed an
      explicit angle from vertical. Use the result to choose the next slicer
      check, not as a support or print-success verdict.
    </p>
    <section class="card viewer-tool">
      <h2>Choose an STL</h2>
      <div class="drop-zone">
        <p>The file stays in this browser and is not modified.</p>
        <button class="button" type="button" (click)="openPicker(picker)">
          Choose STL file
        </button>
        <input
          #picker
          type="file"
          accept=".stl"
          aria-label="Choose STL file"
          (change)="pick($event)"
        />
      </div>
      <p class="hint">
        STL stores no authoritative unit. Select the intended unit before
        interpreting surface area.
      </p>
      <p role="status" aria-live="polite">{{ status() }}</p>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </section>
    <app-example-loader
      [tool]="routeUrl.StlOverhangChecker"
      [active]="!!mesh()"
      [current]="mesh()"
      [busy]="loading()"
      [load]="loadExample"
    />
    @if (mesh()) {
      <section class="card">
        <h2>Build direction, unit and threshold</h2>
        <label
          >Assumed STL unit
          <select [value]="stlUnit()" (change)="setUnit($event)">
            <option value="mm">Millimetres (mm)</option>
            <option value="cm">Centimetres (cm)</option>
            <option value="m">Metres (m)</option>
            <option value="in">Inches (in)</option>
          </select></label
        >
        <label
          >Build direction
          <select
            [value]="buildDirectionId()"
            (change)="setBuildDirection($event)"
          >
            @for (option of buildDirections; track option.id) {
              <option [value]="option.id">{{ option.label }}</option>
            }
          </select></label
        >
        <label
          >Process context
          <select [value]="profile()" (change)="setProfile($event)">
            <option value="FDM">FDM review</option>
            <option value="Resin">Resin orientation review</option>
          </select></label
        >
        <label
          >Flag surfaces steeper than this angle from vertical
          <input
            type="number"
            min="0"
            max="89.9"
            step="0.1"
            [value]="threshold()"
            (input)="setThreshold($event)"
          />
          degrees</label
        >
        <p>
          0° is a vertical wall and 90° is a downward-facing horizontal
          underside. A triangle is flagged only when its slope is strictly
          greater than the selected threshold.
          {{
            profile() === processProfile.Fdm
              ? 'The profile still decides bridge roles, supports and paths.'
              : 'Resin orientation, peel, drainage and support decisions remain outside this screen.'
          }}
        </p>
        <button
          class="button"
          type="button"
          [disabled]="!valid()"
          (click)="analyse()"
        >
          Analyse downward-facing geometry
        </button>
      </section>
    }
    @if (report(); as result) {
      <section class="card result">
        <h2>Downward-facing geometry above your review threshold</h2>
        <p>
          Build direction: {{ selectedBuildDirection().label }} · threshold:
          slope &gt; {{ result.threshold.toFixed(1) }}° from vertical.
        </p>
        <dl class="metrics">
          <div>
            <dt>Nondegenerate triangles analysed</dt>
            <dd>{{ result.analysedTriangleCount.toLocaleString() }}</dd>
          </div>
          <div>
            <dt>Degenerate triangles skipped</dt>
            <dd>{{ result.degenerateTriangleCount.toLocaleString() }}</dd>
          </div>
          <div>
            <dt>Total analysed surface area</dt>
            <dd>{{ result.totalArea.toFixed(2) }} {{ areaUnit() }}</dd>
          </div>
          <div>
            <dt>Flagged triangles</dt>
            <dd>{{ result.flaggedCount.toLocaleString() }}</dd>
          </div>
          <div>
            <dt>Flagged downward-facing area</dt>
            <dd>{{ result.flaggedArea.toFixed(2) }} {{ areaUnit() }}</dd>
          </div>
          <div>
            <dt>Flagged percentage</dt>
            <dd>
              {{ result.flaggedPercentage.toFixed(1) }}% of nondegenerate
              analysed surface area
            </dd>
          </div>
        </dl>
        <p class="legend">
          Visual legend: red triangles are downward-facing and strictly exceed
          the threshold; teal triangles do not meet both conditions. The text
          metrics above provide the same result without relying on colour.
        </p>
        @if (heatmap(); as display) {
          <app-object-viewer
            [object]="display"
            [extent]="extent()"
            [preserveVertexColors]="true"
            ariaLabel="STL downward-facing triangle heatmap"
          />
        }
      </section>
      <section class="card">
        <h2>What the screen supports</h2>
        <div
          class="table-scroll"
          tabindex="0"
          role="region"
          aria-label="Overhang result interpretation table, scroll horizontally"
        >
          <table>
            <thead>
              <tr>
                <th>What you see</th>
                <th>What it supports</th>
                <th>Next check</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Flagged sloped underside</td>
                <td>This face exceeds the chosen geometry threshold</td>
                <td>
                  Compare candidate orientation and native slicer supports
                </td>
              </tr>
              <tr>
                <td>Flagged horizontal roof</td>
                <td>Downward face is present</td>
                <td>Determine bridge anchors or support paths in the slicer</td>
              </tr>
              <tr>
                <td>Unflagged vertical or upward faces</td>
                <td>They do not meet this face-angle condition</td>
                <td>Continue fit, contact, island and slicer review</td>
              </tr>
              <tr>
                <td>Unexpected side highlighted</td>
                <td>Winding or intended build direction may differ</td>
                <td>Confirm topology and orientation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="card">
        <h2>Important limitations and next decisions</h2>
        <p>
          InspectMesh uses triangle vertices and winding to derive oriented face
          normals; an STL's stored normal vector does not control this result.
          The checker does not simulate bridge anchors, assign extrusion roles,
          generate supports or determine whether support can be removed.
        </p>
        <p>
          <a [href]="guideRouteUrl.Route3dPrintBridgeVsOverhang"
            >Bridge or overhang?</a
          >
          ·
          <a [href]="guideRouteUrl.RouteSupportsInsideHolesAndChannels"
            >Can internal support leave?</a
          >
          ·
          <a [href]="routeUrl.OrientationPlanner">Compare six orientations</a> ·
          <a [href]="guideRouteUrl.Route3dPrintOverhangsAndSupportsGuide"
            >Interpret the geometry screen</a
          >
        </p>
      </section>
    }
    <section class="content">
      <h2>Area needs an explicit STL unit assumption</h2>
      <p>
        Uniform positive scale leaves the angle classification unchanged but
        changes surface area by the square of the scale. Non-uniform scaling can
        also change normals and angles, so analyse the final transformed model
        when that operation is part of the slicer project. A zero flagged result
        does not establish bed contact, adhesion, bridges, islands or general
        printability.
      </p>
    </section>
  </main>`,
  styleUrl: '../stl-wall-thickness/stl-wall-thickness-page.scss',
})
export class StlOverhangPage {
  readonly routeUrl = PublicRouteUrl;
  readonly guideRouteUrl = GuideRouteUrl;
  readonly buildDirections = OVERHANG_BUILD_DIRECTIONS;
  readonly processProfile = OverhangProcessProfile;
  readonly mesh = signal<StlMesh | null>(null);
  readonly error = signal('');
  readonly status = signal('');
  readonly loading = signal(false);
  readonly stlUnit = signal<ModelUnit>('mm');
  readonly threshold = signal(45);
  readonly buildDirectionId = signal<OverhangBuildDirection>(
    OverhangBuildDirection.PositiveZ,
  );
  readonly profile = signal<OverhangProcessProfile>(OverhangProcessProfile.Fdm);
  readonly report = signal<OverhangReport | null>(null);
  private fileRevision = 0;
  readonly valid = computed(() => validOverhangThreshold(this.threshold()));
  readonly selectedBuildDirection = computed(() =>
    overhangBuildDirection(this.buildDirectionId()),
  );
  /** three.js heatmap renderer, loaded once a model is analysed. */
  private readonly heatmapRenderer = signal<
    typeof import('../shared/overhang/overhang-heatmap') | null
  >(null);
  readonly heatmap = computed(() => {
    const renderer = this.heatmapRenderer();
    return renderer && this.mesh() && this.report()
      ? renderer.createOverhangHeatmap(this.mesh()!, this.report()!)
      : null;
  });
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: 'STL Overhang Checker - Review Downward Geometry | InspectMesh',
      description:
        'Screen STL triangles by build direction and a strict angle-from-vertical threshold, with analysed area, skipped counts and explicit unit assumptions.',
      path: PublicRouteUrl.StlOverhangChecker,
    });
  }

  openPicker(input: HTMLInputElement): void {
    input.click();
  }

  async pick(event: Event): Promise<void> {
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
    this.error.set('');
    this.status.set('');
    this.mesh.set(null);
    this.report.set(null);
    if (
      !file.name.toLowerCase().endsWith('.stl') ||
      file.size === 0 ||
      file.size > getMaxFileUploadSizeLimit()
    ) {
      this.error.set('Choose a non-empty STL file up to 25 MiB.');
      return;
    }
    this.loading.set(true);
    this.status.set('Reading STL geometry locally…');
    try {
      const mesh = await readStl(file);
      if (revision !== this.fileRevision) {
        return;
      }
      this.mesh.set(mesh);
      this.status.set('STL geometry is ready. Choose settings, then analyse.');
    } catch {
      if (revision === this.fileRevision) {
        this.error.set('We could not read that STL file.');
        this.status.set('');
      }
    } finally {
      if (revision === this.fileRevision) {
        this.loading.set(false);
      }
    }
  }

  setThreshold(event: Event): void {
    this.threshold.set(Number((event.target as HTMLInputElement).value));
    this.invalidateResult();
  }

  setUnit(event: Event): void {
    this.stlUnit.set((event.target as HTMLSelectElement).value as ModelUnit);
    this.invalidateResult();
  }

  setBuildDirection(event: Event): void {
    this.buildDirectionId.set(
      (event.target as HTMLSelectElement).value as OverhangBuildDirection,
    );
    this.invalidateResult();
  }

  setProfile(event: Event): void {
    this.profile.set(
      (event.target as HTMLSelectElement).value as OverhangProcessProfile,
    );
  }

  analyse(): void {
    const mesh = this.mesh();
    if (mesh && this.valid()) {
      this.report.set(
        analyseOverhangs(
          mesh,
          this.threshold(),
          this.selectedBuildDirection().direction,
        ),
      );
      this.status.set('Downward-facing geometry analysis complete.');
      void this.loadHeatmapRenderer();
    }
  }

  private async loadHeatmapRenderer(): Promise<void> {
    if (!this.heatmapRenderer()) {
      this.heatmapRenderer.set(
        await import('../shared/overhang/overhang-heatmap'),
      );
    }
  }

  extent(): number {
    const values = this.mesh()?.positions ?? [];
    return values.length ? Math.max(...values) - Math.min(...values) : 1;
  }

  areaUnit(): string {
    return `${this.stlUnit()}²`;
  }

  private invalidateResult(): void {
    if (this.report()) {
      this.status.set('Settings changed. Run the analysis again.');
    }
    this.report.set(null);
  }
}
