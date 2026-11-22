import { Component, computed, inject, signal } from '@angular/core';
import { getMaxFileUploadSizeLimit } from '../../core/api/upload-limits';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
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
import {
  resolveThreeMfWallGeometry,
  ResolvedThreeMfGeometry,
} from '../shared/wall-thickness/three-mf-wall-thickness';

@Component({
  selector: 'app-three-mf-overhang-page',
  imports: [ExampleLoader, ObjectViewerComponent],
  template: `<main class="page tool-page wall-thickness-page">
    <p class="eyebrow">3MF geometry screen</p>
    <h1>3MF Overhang Checker</h1>
    <p class="lead">
      Resolve the placed 3MF build, then screen transformed triangles whose
      oriented faces point downward and exceed an explicit angle from vertical.
    </p>
    <section class="card viewer-tool">
      <h2>Choose a 3MF build</h2>
      <div class="drop-zone">
        <p>The package stays in this browser and is not modified.</p>
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
      <p role="status" aria-live="polite">{{ status() }}</p>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </section>
    <app-example-loader
      [tool]="routeUrl.ThreeMfOverhangChecker"
      [active]="!!resolved()"
      [current]="resolved()"
      [busy]="loading()"
      [load]="loadExample"
    />
    @if (resolved(); as model) {
      <section class="card">
        <h2>Resolved build and angle settings</h2>
        <p>
          Declared unit: {{ model.declaredUnit
          }}{{ model.declaredUnitExplicitly ? '' : ' (3MF default)' }} ·
          combined scope: {{ model.buildItemCount }} build items and
          {{ model.resolvedMeshCount }} resolved mesh instances · bounds:
          {{ model.bounds.spans[0].toFixed(2) }} ×
          {{ model.bounds.spans[1].toFixed(2) }} ×
          {{ model.bounds.spans[2].toFixed(2) }} mm.
        </p>
        <p>
          Nested component transforms, repeated build items, rotations,
          translations and supported non-uniform transforms are applied before
          normals and physical areas are calculated. Results combine the placed
          scene; the resolver retains per-build-item identity for other tools.
        </p>
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
              ? 'The slicer still decides bridge roles, supports and paths.'
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
            <dd>{{ result.totalArea.toFixed(2) }} mm²</dd>
          </div>
          <div>
            <dt>Flagged triangles</dt>
            <dd>{{ result.flaggedCount.toLocaleString() }}</dd>
          </div>
          <div>
            <dt>Flagged downward-facing area</dt>
            <dd>{{ result.flaggedArea.toFixed(2) }} mm²</dd>
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
            [extent]="resolved()!.extent"
            [preserveVertexColors]="true"
            ariaLabel="Resolved 3MF downward-facing triangle heatmap"
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
                <td>
                  Winding, transform or intended build direction may differ
                </td>
                <td>Confirm placed geometry and orientation</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section class="card">
        <h2>Important limitations and next decisions</h2>
        <p>
          InspectMesh resolves supported geometry transforms, but does not
          interpret support settings, colour or private application extensions.
          It does not simulate bridge anchors, assign extrusion roles, generate
          supports or determine whether support can be removed.
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
      <h2>Example: the same part, placed two ways</h2>
      <p>
        Suppose one 100 x 50 x 5 mm plate object is placed twice in a 3MF build:
        once lying flat, and once rotated 90° to stand on its long edge. The
        flat copy has a 5,000 mm² face pointing straight down; the standing
        copy's large faces become vertical walls, leaving only its 500 mm²
        bottom edge face downward. Both values include the face resting on the
        bed, which this geometry screen does not separate from a real overhang.
        Because the checker screens the placed build, two copies of one stored
        object can give different results, so check the build you will slice.
      </p>
      <h2>Transforms come before the screen</h2>
      <p>
        Translation alone does not change a face angle. Rotation can change
        which triangles point downward, and non-uniform scaling can change
        normals and angles. Declared-unit conversion changes physical area but
        uniform positive scale does not change angle classification. A low or
        zero flagged result does not establish adhesion, bridges, islands or
        general printability.
      </p>
    </section>
  </main>`,
  styleUrl: '../stl-wall-thickness/stl-wall-thickness-page.scss',
})
export class ThreeMfOverhangPage {
  readonly routeUrl = PublicRouteUrl;
  readonly guideRouteUrl = GuideRouteUrl;
  readonly buildDirections = OVERHANG_BUILD_DIRECTIONS;
  readonly processProfile = OverhangProcessProfile;
  readonly resolved = signal<ResolvedThreeMfGeometry | null>(null);
  readonly error = signal('');
  readonly status = signal('');
  readonly loading = signal(false);
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
    return renderer && this.resolved() && this.report()
      ? renderer.createOverhangHeatmap(
          this.resolved()!.geometry,
          this.report()!,
        )
      : null;
  });
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: '3MF Overhang Checker for Placed and Rotated Parts | InspectMesh',
      description:
        'Check overhangs on 3MF parts as placed and rotated in the build: units, items and transforms are resolved before downward-facing triangles are screened.',
      path: PublicRouteUrl.ThreeMfOverhangChecker,
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
    this.resolved.set(null);
    this.report.set(null);
    if (
      !file.name.toLowerCase().endsWith('.3mf') ||
      file.size === 0 ||
      file.size > getMaxFileUploadSizeLimit()
    ) {
      this.error.set('Choose a non-empty 3MF file up to 25 MiB.');
      return;
    }
    this.loading.set(true);
    this.status.set('Resolving placed 3MF build geometry locally…');
    try {
      const resolved = await resolveThreeMfWallGeometry(
        await file.arrayBuffer(),
      );
      if (revision !== this.fileRevision) {
        return;
      }
      this.resolved.set(resolved);
      this.status.set('3MF build is resolved. Choose settings, then analyse.');
    } catch {
      if (revision === this.fileRevision) {
        this.error.set('We could not resolve this 3MF build locally.');
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
    const geometry = this.resolved()?.geometry;
    if (geometry && this.valid()) {
      this.report.set(
        analyseOverhangs(
          geometry,
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

  private invalidateResult(): void {
    if (this.report()) {
      this.status.set('Settings changed. Run the analysis again.');
    }
    this.report.set(null);
  }
}
