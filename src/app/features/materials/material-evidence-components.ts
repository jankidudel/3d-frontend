import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { MaterialRecord, materialSources } from './material-catalogue';
import {
  claimContext,
  claimValue,
  compareClaims,
  MaterialProperty,
  MATERIAL_EVIDENCE_FRAGMENT,
  productClaimLabel,
  type MaterialEvidenceClaim,
} from './material-evidence';

export function materialEvidenceUrl(material: MaterialRecord): string {
  return `${PublicRouteUrl.Materials}/${material.slug}#${MATERIAL_EVIDENCE_FRAGMENT}`;
}
export function evidenceSource(claim: MaterialEvidenceClaim) {
  return materialSources.find((source) => source.id === claim.sourceId)!;
}
@Component({
  selector: 'app-material-evidence',
  imports: [RouterLink],
  styleUrl: './material-evidence.scss',
  template: `@if (material().productExample; as example) {
    <section [id]="fragment">
      <h2>{{ example.heading }}</h2>
      <p>
        <strong>Published product data:</strong> {{ example.manufacturer }} -
        {{ example.productName }}.
      </p>
      <p><strong>Formulation:</strong> {{ example.formulation }}.</p>
      <p>{{ example.interpretation }}</p>
      @if (example.revisionNote) {
        <p>{{ example.revisionNote }}</p>
      }
      <div
        class="evidence-scroll"
        tabindex="0"
        role="region"
        [attr.aria-label]="example.productName + ' evidence table'"
      >
        <table>
          <caption>
            Product claims, their scope and the remaining question
          </caption>
          <thead>
            <tr>
              <th scope="col">Published claim</th>
              <th scope="col">Source and test scope</th>
              <th scope="col">Still to verify</th>
            </tr>
          </thead>
          <tbody>
            @for (claim of example.claims; track claim.id) {
              <tr>
                <th scope="row">
                  {{ claim.property }}
                  <p>{{ label(example, claim) }}</p>
                </th>
                <td>
                  <a [href]="source(claim).url">{{ source(claim).title }}</a
                  >, {{ claim.sourceLocation }}. Version
                  {{ source(claim).documentVersion ?? 'not specified' }};
                  document date
                  {{ source(claim).documentDate ?? 'not specified' }}; checked
                  {{ source(claim).accessedAt }}.
                  <details>
                    <summary>Test and setup details</summary>
                    <p>{{ context(claim) }}</p>
                  </details>
                </td>
                <td>
                  @for (limit of claim.limitations; track limit) {
                    <p>{{ limit }}</p>
                  }
                  @if (!claim.limitations.length) {
                    <p>
                      Verify these instructions with the exact installed printer
                      and spool. They do not qualify your finished part.
                    </p>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (example.checklist; as checks) {
        <ul>
          @for (check of checks; track check) {
            <li>{{ check }}</li>
          }
        </ul>
      }
      <p><strong>Your next evidence:</strong> {{ example.nextCheck }}</p>
      @if (densityClaim(); as density) {
        <p>
          <a
            [routerLink]="routeUrl.FilamentLengthCalculator"
            [queryParams]="{ grade: material().id }"
            >Use this named product's published density in the length
            calculator</a
          >.
        </p>
      }
      <p>
        No physical material testing was performed by InspectMesh. Your
        observations remain separate from these manufacturer reports.
      </p>
    </section>
  }`,
})
export class MaterialEvidenceComponent {
  readonly material = input.required<MaterialRecord>();
  readonly fragment = MATERIAL_EVIDENCE_FRAGMENT;
  readonly routeUrl = PublicRouteUrl;
  readonly source = evidenceSource;
  readonly context = claimContext;
  readonly label = productClaimLabel;
  readonly densityClaim = computed(() =>
    this.material().productExample?.claims.find(
      (claim) =>
        claim.property === MaterialProperty.Density &&
        claim.value !== undefined,
    ),
  );
}

@Component({
  selector: 'app-material-product-comparison',
  styleUrl: './material-evidence.scss',
  template: `<section>
    <h2>Published product examples, separate from the family view</h2>
    <p>
      These are identified formulations chosen to show how to read evidence.
      Selecting a family does not select a brand for your part. HDT rows are
      grouped by reported test load, never by the highest temperature. An absent
      matching-load result remains unavailable; matching a load alone does not
      establish matching specimen or conditioning.
    </p>
    <p>
      <a [href]="evidenceUrl(left())"
        >{{
          left().productExample?.productName ?? left().displayName
        }}
        evidence</a
      >
      ·
      <a [href]="evidenceUrl(right())"
        >{{
          right().productExample?.productName ?? right().displayName
        }}
        evidence</a
      >
    </p>
    <div
      class="evidence-scroll"
      tabindex="0"
      role="region"
      aria-label="Published product example comparison"
    >
      <table>
        <caption>
          Compare reported properties and conditions, without an overall winner
        </caption>
        <thead>
          <tr>
            <th scope="col">Property</th>
            <th scope="col">
              {{ left().productExample?.productName ?? left().displayName }}
            </th>
            <th scope="col">
              {{ right().productExample?.productName ?? right().displayName }}
            </th>
            <th scope="col">Comparison scope</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.key) {
            <tr>
              <th scope="row">
                {{ row.property }}
                @if (row.testLoad) {
                  <span>({{ row.testLoad }})</span>
                }
              </th>
              @for (entry of row.entries; track $index) {
                <td>
                  @if (entry.claim; as claim) {
                    <p>{{ value(claim) }}</p>
                    <a [href]="source(claim).url"
                      >{{ source(claim).publisher }}, v{{
                        source(claim).documentVersion ?? 'unspecified'
                      }}</a
                    >
                    <details>
                      <summary>Source conditions</summary>
                      <p>{{ context(claim) }}</p>
                      <p>
                        {{ claim.sourceLocation }}. Checked
                        {{ source(claim).accessedAt }}.
                      </p>
                    </details>
                  } @else {
                    Not found in this example; not zero.
                  }
                </td>
              }
              <td>
                <strong>{{ row.comparison.outcome }}</strong>
                <p>{{ row.comparison.reason }}</p>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <p>
      HDT is a loaded deflection test, not a continuous service limit. Modulus
      measures stiffness; it is not impact strength. Shore A and D remain
      different scales.
    </p>
  </section>`,
})
export class MaterialProductComparisonComponent {
  readonly left = input.required<MaterialRecord>();
  readonly right = input.required<MaterialRecord>();
  readonly routeUrl = PublicRouteUrl;
  readonly source = evidenceSource;
  readonly context = claimContext;
  readonly value = claimValue;
  readonly evidenceUrl = materialEvidenceUrl;
  readonly rows = computed(() =>
    [
      MaterialProperty.Density,
      MaterialProperty.Hdt,
      MaterialProperty.Modulus,
      MaterialProperty.HardnessA,
      MaterialProperty.HardnessD,
    ]
      .filter((property) =>
        [this.left(), this.right()].some((material) =>
          material.productExample?.claims.some(
            (claim) => claim.property === property,
          ),
        ),
      )
      .flatMap((property) => {
        const records = [this.left(), this.right()];
        const testLoads =
          property === MaterialProperty.Hdt
            ? [
                ...new Set(
                  records.flatMap((material) =>
                    (material.productExample?.claims ?? [])
                      .filter((claim) => claim.property === property)
                      .map((claim) => claim.testLoad),
                  ),
                ),
              ]
            : [undefined];
        return testLoads.map((testLoad) => {
          const entries = records.map((material) => ({
            claim: material.productExample?.claims.find(
              (claim) =>
                claim.property === property &&
                (property !== MaterialProperty.Hdt ||
                  claim.testLoad === testLoad),
            ),
          }));
          return {
            key: `${property}/${testLoad ?? 'unspecified'}`,
            property,
            testLoad,
            entries,
            comparison: compareClaims(entries[0].claim, entries[1].claim),
          };
        });
      }),
  );
}
