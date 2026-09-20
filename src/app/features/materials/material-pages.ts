import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import {
  materialComparisons,
  materialComparisonsBySlug,
} from './material-comparisons';
import {
  materials,
  materialsBySlug,
  materialSources,
  MaterialRecord,
} from './material-catalogue';

@Component({
  selector: 'app-material-hub',
  imports: [RouterLink],
  styleUrl: './material-pages.scss',
  template: `<main class="page material-page material-hub-page">
    <p class="eyebrow">Filament decisions</p>
    <h1>3D Printing Materials</h1>
    <p class="lead">
      Compare typical FDM filament families. Formulations, pigments and filled
      variants can differ, so use these sourced ranges as a starting point and
      check your spool maker’s profile.
    </p>
    <p>
      <a class="button" [routerLink]="routeUrl.MaterialSelector"
        >Choose material for a part</a
      >
      <a [routerLink]="routeUrl.CompareMaterials">Compare two materials</a>
    </p>
    <section class="material-section">
      <h2>Compare material families</h2>
      <div class="material-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Print difficulty</th>
              <th>Flexibility</th>
              <th>Heat</th>
              <th>Weather</th>
            </tr>
          </thead>
          <tbody>
            @for (material of materialList; track material.id) {
              <tr>
                <th scope="row">
                  <a [routerLink]="['/3d-printing-materials', material.slug]">{{
                    material.displayName
                  }}</a>
                </th>
                <td>{{ material.difficulty }}</td>
                <td>{{ material.ratings.flexibility }}/5</td>
                <td>{{ material.ratings.heat }}/5</td>
                <td>{{ material.ratings.weather }}/5</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
    <section class="tool-grid material-card-grid">
      @for (material of materialList; track material.id) {
        <article class="card tool-card">
          <h2>{{ material.displayName }}</h2>
          <p>{{ material.summary }}</p>
          <a [routerLink]="['/3d-printing-materials', material.slug]"
            >Uses and printing guide</a
          >
        </article>
      }
    </section>
  </main>`,
})
export class MaterialHubPage {
  readonly routeUrl = PublicRouteUrl;
  readonly materialList = materials;
  constructor() {
    inject(SeoService).apply({
      title:
        '3D Printing Materials - Compare Filament Properties | InspectMesh',
      description:
        'Compare eight FDM filament families, their practical trade-offs and setup expectations.',
      path: PublicRouteUrl.Materials,
    });
  }
}

@Component({
  selector: 'app-material-detail',
  imports: [RouterLink],
  styleUrl: './material-pages.scss',
  template: `<main class="page material-page material-detail-page">
    @if (material(); as item) {
      <p class="breadcrumbs">
        <a [routerLink]="routeUrl.Materials">3D Printing Materials</a> /
        {{ item.displayName }}
      </p>
      <h1>
        {{ item.displayName }} Filament: Uses, Properties and Printing Guide
      </h1>
      <p class="lead">{{ item.summary }}</p>
      <p>
        <a
          class="button"
          [routerLink]="routeUrl.MaterialSelector"
          [queryParams]="{ material: item.id }"
          >Check whether it fits your part</a
        >
      </p>
      <section>
        <h2>Best uses and poor fits</h2>
        <h3>Commonly selected for</h3>
        <ul>
          @for (entry of item.bestFor; track entry) {
            <li>{{ entry }}</li>
          }
        </ul>
        <h3>Consider another material for</h3>
        <ul>
          @for (entry of item.poorFitFor; track entry) {
            <li>{{ entry }}</li>
          }
        </ul>
      </section>
      <section>
        <h2>Starting setup range</h2>
        <p>
          <strong>Printing difficulty:</strong> {{ item.difficulty }}.
          <strong>Nozzle:</strong> {{ item.nozzle[0] }}-{{ item.nozzle[1] }} C.
          <strong>Bed:</strong> {{ item.bed[0] }}-{{ item.bed[1] }} C.
        </p>
        <p>
          These are generic starting ranges, not a universal profile. Check the
          exact spool manufacturer guidance. Enclosure expectation:
          {{ item.enclosure }}. Drying importance: {{ item.drying }}.
        </p>
      </section>
      <section>
        <h2>Property profile</h2>
        <p>{{ methodology }}</p>
        <p>
          Stiffness {{ item.ratings.stiffness }}/5 · Toughness
          {{ item.ratings.toughness }}/5 · Flexibility
          {{ item.ratings.flexibility }}/5 · Heat resistance
          {{ item.ratings.heat }}/5 · Weather resistance
          {{ item.ratings.weather }}/5 · Ease {{ item.ratings.ease }}/5.
        </p>
      </section>
      <section>
        <h2>Printing and design cautions</h2>
        <ul>
          @for (entry of item.risks; track entry) {
            <li>{{ entry }}</li>
          }
          @for (entry of item.designNotes; track entry) {
            <li>{{ entry }}</li>
          }
        </ul>
      </section>
      <section>
        <h2>Major limitations and safety notes</h2>
        <ul>
          @for (entry of item.limitations; track entry) {
            <li>{{ entry }}</li>
          }
        </ul>
        <p>
          Use normal good workshop practice and manufacturer safety information.
          This is generic guidance, not a hands-on spool review or a safety
          certification.
        </p>
      </section>
      <section>
        <h2>Related comparisons</h2>
        <ul>
          @for (comparison of comparisons(); track comparison.slug) {
            <li>
              <a [routerLink]="['/compare-materials', comparison.slug]">{{
                comparison.slug.replaceAll('-', ' ')
              }}</a>
            </li>
          }
        </ul>
      </section>
      <section>
        <h2>Plan material and cost</h2>
        <p>
          <a
            [routerLink]="routeUrl.PrintCostCalculator"
            [queryParams]="{ material: item.id }"
            >Estimate print cost</a
          >
          ·
          <a
            [routerLink]="routeUrl.FilamentLengthCalculator"
            [queryParams]="{ material: item.id }"
            >Estimate filament length</a
          >
        </p>
      </section>
      <section>
        <h2>Sources</h2>
        <p>Last verified {{ item.lastVerifiedAt }}.</p>
        <ul>
          @for (source of sources(item); track source.id) {
            <li>
              <a [href]="source.url" target="_blank" rel="noopener noreferrer"
                >{{ source.publisher }}: {{ source.title }}</a
              >
            </li>
          }
        </ul>
      </section>
    }
  </main>`,
})
export class MaterialDetailPage {
  readonly routeUrl = PublicRouteUrl;
  readonly methodology =
    'The five-point ratings are editorial comparison bands for typical unfilled material families, not laboratory measurements.';
  private readonly slug = inject(Router).url.split('/').at(-1) ?? '';
  readonly material = computed(() => materialsBySlug.get(this.slug));
  readonly comparisons = computed(() =>
    materialComparisons.filter(
      (comparison) =>
        comparison.materialAId === this.material()?.id ||
        comparison.materialBId === this.material()?.id,
    ),
  );
  constructor() {
    const material = this.material();
    if (!material) {
      throw new Error('Unknown material');
    }
    inject(SeoService).apply({
      title: `${material.displayName} Filament: Uses, Properties and Printing Guide | InspectMesh`,
      description: material.summary,
      path: `/3d-printing-materials/${material.slug}`,
      openGraphType: 'article',
    });
  }
  sources(material: MaterialRecord) {
    return materialSources.filter((source) =>
      material.sourceRefs.includes(source.id),
    );
  }
}

@Component({
  selector: 'app-material-comparison-detail',
  imports: [RouterLink],
  styleUrl: './material-pages.scss',
  template: `<main class="page material-page material-comparison-detail-page">
    @if (comparison(); as record) {
      <p class="breadcrumbs">
        <a [routerLink]="routeUrl.CompareMaterials"
          >Compare 3D Printing Materials</a
        >
      </p>
      <h1>
        {{ left().displayName }} vs {{ right().displayName }}: Which Filament
        Should You Use?
      </h1>
      <p class="lead">{{ record.summary }}</p>
      <section>
        <h2>Choose {{ left().displayName }} when</h2>
        <ul>
          @for (entry of record.chooseAWhen; track entry) {
            <li>{{ entry }}</li>
          }
        </ul>
        <h2>Choose {{ right().displayName }} when</h2>
        <ul>
          @for (entry of record.chooseBWhen; track entry) {
            <li>{{ entry }}</li>
          }
        </ul>
      </section>
      <section>
        <h2>Side-by-side context</h2>
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>{{ left().displayName }}</th>
              <th>{{ right().displayName }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Difficulty</th>
              <td>{{ left().difficulty }}</td>
              <td>{{ right().difficulty }}</td>
            </tr>
            <tr>
              <th scope="row">Nozzle starting range</th>
              <td>{{ left().nozzle[0] }}-{{ left().nozzle[1] }} C</td>
              <td>{{ right().nozzle[0] }}-{{ right().nozzle[1] }} C</td>
            </tr>
            <tr>
              <th scope="row">Heat band</th>
              <td>{{ left().ratings.heat }}/5</td>
              <td>{{ right().ratings.heat }}/5</td>
            </tr>
            <tr>
              <th scope="row">Flexibility band</th>
              <td>{{ left().ratings.flexibility }}/5</td>
              <td>{{ right().ratings.flexibility }}/5</td>
            </tr>
          </tbody>
        </table>
        <p>
          Ranges and bands are a starting point. Formulations, drying, build
          surface and printer environment can change the result.
        </p>
      </section>
      <p>
        <a [routerLink]="['/3d-printing-materials', left().slug]"
          >{{ left().displayName }} guide</a
        >
        ·
        <a [routerLink]="['/3d-printing-materials', right().slug]"
          >{{ right().displayName }} guide</a
        >
        · <a [routerLink]="routeUrl.MaterialSelector">Use the selector</a>
      </p>
      <p>Reviewed {{ record.lastReviewedAt }}.</p>
    }
  </main>`,
})
export class MaterialComparisonDetailPage {
  readonly routeUrl = PublicRouteUrl;
  private readonly slug = inject(Router).url.split('/').at(-1) ?? '';
  readonly comparison = computed(() =>
    materialComparisonsBySlug.get(this.slug),
  );
  readonly left = computed(() => {
    const result = this.comparison();
    if (!result) {
      throw new Error('Unknown material comparison');
    }
    return materials.find((material) => material.id === result.materialAId)!;
  });
  readonly right = computed(() =>
    materials.find(
      (material) => material.id === this.comparison()!.materialBId,
    )!,
  );
  constructor() {
    const comparison = this.comparison();
    if (!comparison) {
      throw new Error('Unknown material comparison');
    }
    const left = this.left();
    const right = this.right();
    inject(SeoService).apply({
      title: `${left.displayName} vs ${right.displayName}: Which Filament Should You Use? | InspectMesh`,
      description: comparison.summary,
      path: `/compare-materials/${comparison.slug}`,
      openGraphType: 'article',
    });
  }
}
