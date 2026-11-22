import { usePageBreadcrumbs } from '../../core/components/breadcrumbs/breadcrumbs';
import {
  MaterialEvidenceComponent,
  MaterialProductComparisonComponent,
  materialEvidenceUrl,
} from './material-evidence-components';
import { PublicRouteSegment } from '../../core/seo/public-routes';
import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { materialDecisionExamples } from '../repeat-workflows/material-decision-examples';
import { materialPreparation } from './material-preparation';
import {
  ProductLinkComponent,
  ProductRecords,
} from '../repeat-workflows/product-link';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  MaterialId,
} from './material-catalogue';

const TITLE_SUFFIX = ' | InspectMesh';
/** Longest page title shown in full in most search results. */
const MAX_TITLE_LENGTH = 65;

/** Uses the preferred title unless it would be truncated in search results. */
function fittedTitle(preferred: string, short: string): string {
  const full = preferred + TITLE_SUFFIX;
  return full.length <= MAX_TITLE_LENGTH ? full : short + TITLE_SUFFIX;
}

@Component({
  selector: 'app-material-hub',
  imports: [RouterLink],
  styleUrl: './material-pages.scss',
  template: `<main class="page material-page material-hub-page">
    <p class="eyebrow">Filament decisions</p>
    <h1>Types of 3D Printing Filament</h1>
    <p class="lead">
      The eight common FDM filament types are PLA, PETG, ABS, ASA, TPU, nylon,
      polycarbonate and polypropylene. PLA is the easy choice for visual and
      low-heat indoor parts, PETG for everyday functional parts. ABS (heat) and
      ASA (outdoor UV) usually need an enclosure. TPU is flexible. Nylon,
      polycarbonate and polypropylene are demanding engineering filaments for
      wear, high-heat and chemical-contact parts. Formulations and filled
      variants differ, so check your spool maker's profile.
    </p>
    <p>
      <a class="button" [routerLink]="routeUrl.MaterialSelector"
        >Choose material for a part</a
      >
      <a [routerLink]="routeUrl.CompareMaterials">Compare two materials</a>
    </p>
    <section class="material-section">
      <h2>Choose by the job and the equipment</h2>
      <p>
        For outdoor parts, compare sunlight, actual operating temperature and
        sustained load separately. For brackets and holders, consider layer
        direction, stiffness, impact and creep rather than selecting a family
        from a single rating. Exact formulations and filled variants need their
        own evidence.
      </p>
      <p>
        Use <a [routerLink]="routeUrl.MaterialSelector">the selector</a> for
        application requirements, then check the exact printer and nozzle
        system. The
        <a [routerLink]="routeUrl.FilamentRemainingCalculator"
          >partial-spool calculator</a
        >
        owns next-job sufficiency; solid volume and density do not replace
        complete slicer consumption.
      </p>
      <p>
        <a [routerLink]="guideRouteUrl.RouteFilamentDryerVsDryBox"
          >Storage versus active drying</a
        >
        is a separate equipment decision. No local stock or retailer
        availability is inferred from a product-family name.
      </p>
    </section>
    <section class="material-section">
      <h2>Each filament type at a glance</h2>
      <p>
        Start with the part's function, then check the exact spool and printer
        workflow. Product-sheet values describe the named formulation and test,
        rather than every part in the family.
      </p>
      <div
        class="material-table-scroll"
        tabindex="0"
        role="region"
        aria-label="Material reference table"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">Family and reason to investigate</th>
              <th scope="col">Preparation that changes the workflow</th>
              <th scope="col">Decision needing product evidence</th>
            </tr>
          </thead>
          <tbody>
            @for (material of materialList; track material.id) {
              <tr>
                <th scope="row">
                  <a [routerLink]="[routeUrl.Materials, material.slug]">{{
                    material.displayName
                  }}</a>
                  <p>{{ material.bestFor.join(', ') }}</p>
                </th>
                <td>{{ preparation[material.id].surface }}</td>
                <td>
                  {{ preparation[material.id].question }}
                  <a [href]="evidenceUrl(material)"
                    >Read the named product example</a
                  >
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>How to read the evidence</h2>
      <p>
        If lines separate as they go down, check
        <a [routerLink]="guideRouteUrl.Route3dPrintFirstLayerNotSticking"
          >the first-layer paths and surface setup</a
        >
        for the exact filament and sheet. If a continuous base lifts later,
        <a [routerLink]="guideRouteUrl.Route3dPrintWarpingCornersLifting"
          >record the corner and when it first rises</a
        >
        before revising the profile.
      </p>
      <ul>
        <li>
          <strong>Family guidance:</strong> a qualitative starting point, such
          as PETG support-removal or surface-adhesion preparation.
        </li>
        <li>
          <strong>Published product data:</strong> a named formulation, document
          revision, property and test context. TPU hardness needs its Shore
          scale; a PA11 result does not describe PA6.
        </li>
        <li>
          <strong>Your observation:</strong> a measured fit, mass or deformation
          from your own recorded process. It does not become a manufacturer
          property.
        </li>
      </ul>
      <p>
        For example, an HDT result under a stated load does not specify
        continuous operating temperature. Read source conditions before
        comparing numbers. InspectMesh has not physically tested these
        filaments.
      </p>
      <ul>
        <li>
          <a [routerLink]="guideRouteUrl.Route3dPrintHeatResistanceHdtVsTg"
            >What does HDT or Tg actually describe?</a
          >
          Read method and load before comparing thermal numbers.
        </li>
        <li>
          <a [routerLink]="guideRouteUrl.Route3dPrintCreepUnderSustainedLoad"
            >Will shape or holding force change over time?</a
          >
          Separate sustained loading from constrained deformation.
        </li>
        <li>
          <a
            [routerLink]="
              guideRouteUrl.Route3dPrintMoistureAndDimensionalStability
            "
            >Were fit readings taken in comparable states?</a
          >
          Keep moisture uptake separate from dimensional change.
        </li>
      </ul>
    </section>
    <section class="tool-grid material-card-grid">
      @for (material of materialList; track material.id) {
        <article class="card tool-card">
          <h2>{{ material.displayName }}</h2>
          <p>{{ material.summary }}</p>
          <a [routerLink]="[routeUrl.Materials, material.slug]"
            >{{ material.displayName }} uses and printing</a
          >
        </article>
      }
    </section>
    <section id="methodology">
      <h2>How these material pages are researched</h2>
      <ul>
        <li>
          Preparation advice summarises the linked material-family guidance and
          shows the date it was checked. Use the exact spool and printer profile
          for temperatures and drying.
        </li>
        <li>
          Five-point ratings are editorial comparison bands for typical unfilled
          families, not laboratory measurements.
        </li>
        <li>
          Suggested test prints are checks for your own process, not tests
          InspectMesh has performed. Record the product, orientation, settings
          and result before applying it to a larger part.
        </li>
        <li>
          Decision scenarios are illustrative, not physical material tests.
        </li>
        <li>
          Safety notes are generic. Follow normal workshop practice and the
          manufacturer's safety information; nothing here is a spool review or
          safety certification.
        </li>
      </ul>
    </section>
  </main>`,
})
export class MaterialHubPage {
  readonly preparation = materialPreparation;
  readonly evidenceUrl = materialEvidenceUrl;
  readonly guideRouteUrl = GuideRouteUrl;
  readonly materialIds = MaterialId;
  readonly routeUrl = PublicRouteUrl;
  readonly materialList = materials;
  constructor() {
    inject(SeoService).apply({
      title: 'Types of 3D Printing Filament and Their Uses | InspectMesh',
      description:
        'The eight common FDM filament types, from PLA and PETG to ABS, ASA, TPU, nylon, PC and PP: what each is used for and the setup it needs.',
      path: PublicRouteUrl.Materials,
    });
  }
}

@Component({
  selector: 'app-material-detail',
  imports: [RouterLink, ProductLinkComponent, MaterialEvidenceComponent],
  styleUrl: './material-pages.scss',
  template: `<main class="page material-page material-detail-page">
    @if (material(); as item) {
      <h1>{{ item.displayName }} Filament: Uses and How to Print It</h1>
      <p class="lead">{{ item.summary }}</p>
      <p>
        <a
          class="button"
          [routerLink]="routeUrl.MaterialSelector"
          [queryParams]="{ material: item.id }"
          >Check {{ item.displayName }} against your part</a
        >
      </p>
      <section>
        <h2>What {{ item.displayName }} is good for</h2>
        <h3>Good choices</h3>
        <ul>
          @for (entry of item.bestFor; track entry) {
            <li>{{ entry }}</li>
          }
        </ul>
        <h3>Choose something other than {{ item.displayName }} for</h3>
        <ul>
          @for (entry of item.poorFitFor; track entry) {
            <li>{{ entry }}</li>
          }
        </ul>
      </section>
      <section>
        <h2>How to print {{ item.displayName }}</h2>
        <p><strong>Printing difficulty:</strong> {{ item.difficulty }}.</p>
        <p>{{ preparation().setup }}</p>
        <p>{{ preparation().surface }}</p>
      </section>
      <section>
        <h2>{{ preparation().question }}</h2>
        <p>{{ preparation().decision }}</p>
        <h3>Test {{ item.displayName }} before the full part</h3>
        <p>{{ preparation().trial }}</p>
      </section>
      <app-material-evidence [material]="item" />
      <p>
        <a [routerLink]="guideRouteUrl.RouteFilamentDryerVsDryBox"
          >Read drying instructions with the equipment limits</a
        >
        ·
        <a [routerLink]="guideRouteUrl.RouteBrassVsHardenedNozzle"
          >Check filler requirements and installed nozzle fitment</a
        >
      </p>
      <section>
        <h2>{{ item.displayName }} printing and design cautions</h2>
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
        <h2>{{ item.displayName }} limitations and safety notes</h2>
        <ul>
          @for (entry of item.limitations; track entry) {
            <li>{{ entry }}</li>
          }
        </ul>
      </section>
      <section>
        <h2>Compare {{ item.displayName }} with other filaments</h2>
        <ul>
          @for (comparison of comparisons(); track comparison.slug) {
            <li>
              <a [routerLink]="[comparisonBase, comparison.slug]">{{
                comparison.slug.replaceAll('-', ' ')
              }}</a>
            </li>
          }
        </ul>
      </section>
      <section>
        <h2>Plan {{ item.displayName }} use and cost</h2>
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
        <p>
          Catalogue checked {{ item.lastVerifiedAt }}; preparation guidance
          checked {{ preparation().reviewedAt }}.
          <a [routerLink]="routeUrl.Materials" fragment="methodology"
            >How these pages are researched</a
          >.
        </p>
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
    <section class="material-section">
      <h2>{{ decision().heading }}</h2>
      <p>{{ decision().example }}</p>
      <p>{{ decision().next }}</p>
      <p>
        <a [routerLink]="decision().guide">{{ decision().guideLabel }}</a>
      </p>
      <p>
        Check
        <a href="https://help.prusa3d.com/article/drying-filament_332086"
          >the exact drying guidance</a
        >
        and product datasheet before using a numerical drying cycle.
      </p>
    </section>
    <app-product-link [product]="referral" />
    @if (
      material()?.id === materialIds.Petg ||
      material()?.id === materialIds.Nylon
    ) {
      <app-product-link [product]="storageReferral" />
    }
  </main>`,
})
export class MaterialDetailPage {
  readonly comparisonBase = `/${PublicRouteSegment.MaterialComparisons}`;
  readonly guideRouteUrl = GuideRouteUrl;
  readonly preparation = computed(
    () => materialPreparation[this.material()!.id],
  );
  readonly decision = computed(
    () => materialDecisionExamples[this.material()!.id],
  );
  readonly materialIds = MaterialId;
  readonly referral = ProductRecords.Filament;
  readonly storageReferral = ProductRecords.Storage;

  readonly routeUrl = PublicRouteUrl;
  readonly methodology =
    'The five-point ratings are editorial comparison bands for typical unfilled material families, not laboratory measurements.';
  private readonly slug =
    inject(ActivatedRoute).snapshot.url.at(-1)?.path ?? '';
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
      title: fittedTitle(
        `${material.displayName} Filament: Uses and How to Print It`,
        `${material.displayName} Filament: Uses and Printing`,
      ),
      description: material.summary,
      path: `${PublicRouteUrl.Materials}/${material.slug}`,
      openGraphType: 'article',
    });
    usePageBreadcrumbs([
      { label: '3D Printing Materials', href: PublicRouteUrl.Materials },
      {
        label: material.displayName,
        href: `${PublicRouteUrl.Materials}/${material.slug}`,
      },
    ]);
  }
  sources(material: MaterialRecord) {
    return materialSources.filter((source) =>
      material.sourceRefs.includes(source.id),
    );
  }
}

@Component({
  selector: 'app-material-comparison-detail',
  imports: [RouterLink, MaterialProductComparisonComponent],
  styleUrl: './material-pages.scss',
  template: `<main class="page material-page material-comparison-detail-page">
    @if (comparison(); as record) {
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
        <h2>Requirements that decide this pair</h2>
        <div
          class="material-table-scroll"
          tabindex="0"
          role="region"
          aria-label="Material reference table"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Requirement</th>
                <th scope="col">{{ left().displayName }}</th>
                <th scope="col">{{ right().displayName }}</th>
              </tr>
            </thead>
            <tbody>
              @for (row of record.criteria; track row.requirement) {
                <tr>
                  <th scope="row">{{ row.requirement }}</th>
                  <td>{{ row.left }}</td>
                  <td>{{ row.right }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>{{ record.scenarioTitle }}</h2>
        <p>{{ record.scenario }}</p>
        <p>
          Hypothetical application, not an InspectMesh physical material test.
        </p>
      </section>
      <section>
        <h2>When the initial choice changes</h2>
        <p>{{ record.reversals }}</p>
      </section>
      <section>
        <h2>Evidence that would change this choice</h2>
        <p><strong>Conditional choice:</strong> {{ record.verdict }}</p>
        <p>{{ record.evidenceQuestion }}</p>
        <p>
          <strong>Next evidence to collect:</strong> {{ record.evidenceAction }}
        </p>
        <p>
          <a [routerLink]="record.evidenceGuide">{{
            record.evidenceGuideLabel
          }}</a>
        </p>
        <p>
          Family context explains the trade-off above. The named examples below
          retain their own formulation and test scope.
        </p>
      </section>
      <app-material-product-comparison [left]="left()" [right]="right()" />
      <p>
        <a
          [routerLink]="routeUrl.CompareMaterials"
          [queryParams]="{ left: left().id, right: right().id }"
          >Open this pair in the comparison tool</a
        >
      </p>
      <section>
        <h2>Prepare the exact formulation</h2>
        <p>{{ record.preparation }}</p>
        <p>
          Use the spool maker's settings and datasheet; a family-wide nozzle
          range is not a qualified profile.
        </p>
      </section>
      <section>
        <h2>Sources for this decision</h2>
        <ul>
          @for (source of pairSources(); track source.id) {
            <li>
              <a [href]="source.url"
                >{{ source.publisher }}: {{ source.title }}</a
              >
              (checked {{ source.accessedAt }})
            </li>
          }
        </ul>
        <p>
          Sources describe the material families and printing preparation.
          Application dimensions and qualification steps above are illustrative
          design decisions.
        </p>
      </section>
      <p>
        <a [routerLink]="[routeUrl.Materials, left().slug]"
          >{{ left().displayName }} guide</a
        >
        ·
        <a [routerLink]="[routeUrl.Materials, right().slug]"
          >{{ right().displayName }} guide</a
        >
        · <a [routerLink]="routeUrl.MaterialSelector">Use the selector</a>
      </p>
      <p>Reviewed {{ record.lastReviewedAt }}.</p>
    }
  </main>`,
})
export class MaterialComparisonDetailPage {
  readonly pairSources = computed(() =>
    materialSources.filter(
      (source) =>
        this.left().sourceRefs.includes(source.id) ||
        this.right().sourceRefs.includes(source.id),
    ),
  );

  readonly routeUrl = PublicRouteUrl;
  private readonly slug =
    inject(ActivatedRoute).snapshot.url.at(-1)?.path ?? '';
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
      title: fittedTitle(
        `${left.displayName} vs ${right.displayName}: Which Filament Should You Use?`,
        `${left.displayName} vs ${right.displayName} Filament Compared`,
      ),
      description: comparison.summary,
      path: `/${PublicRouteSegment.MaterialComparisons}/${comparison.slug}`,
      openGraphType: 'article',
    });
    usePageBreadcrumbs([
      {
        label: 'Compare 3D Printing Materials',
        href: PublicRouteUrl.CompareMaterials,
      },
      {
        label: `${left.displayName} vs ${right.displayName}`,
        href: `/${PublicRouteSegment.MaterialComparisons}/${comparison.slug}`,
      },
    ]);
  }
}
