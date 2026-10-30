import { MaterialComparisonRouteUrl } from '../../core/seo/public-routes';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  MaterialProductComparisonComponent,
  materialEvidenceUrl,
} from './material-evidence-components';
import { materialComparisons } from './material-comparisons';
import { materialPreparation } from './material-preparation';
import type { PrinterRecord } from '../printer-comparison/printer-catalogue';
import type { ProductEvidence } from './material-evidence';
import { CompatibilityVerdict } from './material-catalogue';
import { PublicRouteSegment } from '../../core/seo/public-routes';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { printers } from '../printer-comparison/printer-catalogue';
import {
  compatibilityFor,
  MaterialId,
  materials,
  materialSources,
} from './material-catalogue';

export const UseCase = {
  Visual: 'visual',
  Functional: 'functional',
  Outdoor: 'outdoor',
  Heat: 'heat',
  Flexible: 'flexible',
  Impact: 'impact',
} as const;
export type UseCase = (typeof UseCase)[keyof typeof UseCase];
type Score = Readonly<{
  material: (typeof materials)[number];
  total: number;
  reasons: readonly string[];
  blockers: readonly string[];
  tradeoffs: readonly string[];
  unknowns: readonly string[];
}>;
export function scoreMaterial(
  material: (typeof materials)[number],
  useCase: UseCase,
  enclosure: boolean,
): Score {
  const reasons: string[] = [];
  const blockers: string[] = [];
  const tradeoffs: string[] = [];
  const unknowns: string[] = [
    'Exact spool, printed geometry and service conditions still need verification.',
  ];
  let total = material.ratings.ease;
  const rating =
    useCase === UseCase.Visual
      ? material.ratings.ease
      : useCase === UseCase.Functional
        ? material.ratings.toughness
        : useCase === UseCase.Outdoor
          ? material.ratings.weather
          : useCase === UseCase.Heat
            ? material.ratings.heat
            : useCase === UseCase.Flexible
              ? material.ratings.flexibility
              : material.ratings.toughness;
  total += rating * 3;
  if (rating >= 4) {
    reasons.push(
      `Investigate it for ${material.bestFor.join(', ')}; this is an editorial family preference.`,
    );
  } else if (rating <= 2) {
    tradeoffs.push(`Its ${useCase} band is a weak fit for this priority.`);
  }
  if (material.enclosure === 'usually' && !enclosure) {
    tradeoffs.push(
      'Family preparation guidance favours a controlled environment. Verify the selected product instructions; this is not a universal hardware exclusion.',
    );
    unknowns.push('Exact product enclosure requirement has not been selected.');
  }
  if (useCase === UseCase.Flexible && material.ratings.flexibility < 4) {
    blockers.push(
      'This family does not meet the flexible-part priority; a thin rigid geometry is not an elastic material substitute.',
    );
    total -= 20;
  }
  if (material.drying === 'high') {
    tradeoffs.push('Drying and careful storage are typically important.');
  }
  if (useCase === UseCase.Outdoor) {
    unknowns.push(
      'Exposure duration, sun, water and mounting temperature are unspecified; no lifespan is predicted.',
    );
  }
  if (useCase === UseCase.Heat) {
    unknowns.push(
      'Actual temperature, load and duration are missing; no service temperature is inferred.',
    );
  }
  if (!reasons.length) {
    reasons.push(
      `Possible uses: ${material.bestFor.join(', ')}. Check the stated part function first.`,
    );
  }
  return { material, total, reasons, blockers, tradeoffs, unknowns };
}
export const HardwareEvidence = {
  Unknown: 'unknown',
  Present: 'present',
  Absent: 'absent',
} as const;
export type HardwareEvidence =
  (typeof HardwareEvidence)[keyof typeof HardwareEvidence];
export function productConstraints(
  product: ProductEvidence | undefined,
  printer: PrinterRecord | undefined,
  hasEnclosure: boolean,
  nozzle: HardwareEvidence,
) {
  const constraints: string[] = [];
  const unknowns: string[] = [];
  if (!product) {
    return {
      constraints,
      unknowns: [
        'No exact product selected. Family preference does not establish hardware compatibility.',
      ],
    };
  }
  if (product.enclosureRequired) {
    if (!hasEnclosure && printer?.enclosed === false) {
      constraints.push(
        `${product.productName} documents an enclosure/chamber requirement; the selected printer is open-frame and no suitable enclosure has been confirmed.`,
      );
    } else {
      unknowns.push(
        `${product.productName}: verify the documented chamber conditions; an enclosure checkbox does not establish its temperature or profile.`,
      );
    }
  }
  if (product.hardenedNozzleRequired) {
    if (nozzle === HardwareEvidence.Absent) {
      constraints.push(
        `${product.productName} requires a hardened nozzle; the installed nozzle was declared unsuitable.`,
      );
    } else if (nozzle === HardwareEvidence.Unknown) {
      unknowns.push(
        `${product.productName}: installed nozzle wear resistance and fitment are unknown.`,
      );
    } else {
      unknowns.push(
        'User reports wear-resistant hardware; verify its exact fitment and manufacturer-approved product profile.',
      );
    }
  }
  unknowns.push(
    'Bed surface, full profile and finished-part performance need their own evidence. No complete compatibility pass is asserted.',
  );
  return { constraints, unknowns };
}
export function parseMaterialPair(left: string | null, right: string | null) {
  const valid = (id: string | null, fallback: MaterialId): MaterialId | '' =>
    id === null
      ? fallback
      : (materials.find((material) => material.id === id)?.id ?? '');
  return {
    left: valid(left, MaterialId.Pla),
    right: valid(right, MaterialId.Petg),
  };
}
@Component({
  selector: 'app-material-selector',
  imports: [RouterLink],
  styleUrl: './material-pages.scss',
  template: `<main class="page material-page material-selector-page">
    <p class="eyebrow">Browser-local planning tool</p>
    <h1>3D Printing Material Selector</h1>
    <p class="lead">
      Rank material families for your intended part. It is an explainable
      starting point, not a guaranteed printer profile.
    </p>
    <section class="card material-form-card">
      <fieldset>
        <legend id="material-need-label">What is the primary need?</legend>
        <select
          aria-labelledby="material-need-label"
          [value]="useCase()"
          (change)="useCase.set($any($event.target).value)"
        >
          @for (choice of choices; track choice.value) {
            <option [value]="choice.value">{{ choice.label }}</option>
          }
        </select>
      </fieldset>
      <label
        ><input
          type="checkbox"
          [checked]="hasEnclosure()"
          (change)="hasEnclosure.set($any($event.target).checked)"
        />
        I have an enclosure suitable for this printer</label
      >
      <label
        >Optional printer
        <select
          [value]="printerId()"
          (change)="printerId.set($any($event.target).value)"
        >
          <option value="">No printer selected</option>
          @for (printer of publishedPrinters; track printer.id) {
            <option [value]="printer.id">{{ printer.displayName }}</option>
          }
        </select>
      </label>
    </section>
    <section class="material-product-context">
      <h2>Optional exact-product hardware context</h2>
      <p>
        Choose a published example deliberately. This does not select a brand
        for the entire family.
      </p>
      <label
        >Product example
        <select
          [value]="productId()"
          (change)="productId.set($any($event.target).value)"
        >
          <option value="">No exact product selected</option>
          <option value="" disabled>Choose a valid family</option>
          @for (material of materialList; track material.id) {
            <option [value]="material.id">
              {{ material.productExample?.productName }}
            </option>
          }
        </select>
      </label>
      @if (selectedProduct()?.productExample?.hardenedNozzleRequired) {
        <label
          >Installed nozzle wear resistance
          <select
            [value]="nozzleEvidence()"
            (change)="nozzleEvidence.set($any($event.target).value)"
          >
            <option [value]="hardware.Unknown">Unknown</option>
            <option [value]="hardware.Present">
              Compatible wear-resistant nozzle confirmed by me
            </option>
            <option [value]="hardware.Absent">
              No suitable hardened nozzle installed
            </option>
          </select>
        </label>
      }
      @for (constraint of constraints().constraints; track constraint) {
        <p><strong>Documented product constraint:</strong> {{ constraint }}</p>
      }
      @for (unknown of constraints().unknowns; track unknown) {
        <p><strong>Unverified requirement:</strong> {{ unknown }}</p>
      }
      @if (selectedProduct(); as product) {
        <p>
          <a [href]="evidenceUrl(product)"
            >Read {{ product.productExample?.productName }} source scope</a
          >
        </p>
      }
    </section>
    <section aria-live="polite">
      <h2>Suggested starting points</h2>
      <p>
        Candidate preference is editorial ordering for the chosen function.
        Family preparation cautions, documented exact-product constraints and
        unverified requirements are shown separately. Rigid families are
        excluded from a flexible-part shortlist.
      </p>
      <div class="tool-grid material-card-grid material-result-grid">
        @for (score of ranked(); track score.material.id; let rank = $index) {
          <article class="card tool-card">
            <h3>{{ rank + 1 }}. {{ score.material.displayName }}</h3>
            <p>
              <strong>Candidate preference:</strong> editorial order, not a
              success percentage.
            </p>
            <p>{{ score.material.summary }}</p>
            <ul>
              @for (reason of score.reasons; track reason) {
                <li>{{ reason }}</li>
              }
              @for (blocker of score.blockers; track blocker) {
                <li><strong>Function mismatch:</strong> {{ blocker }}</li>
              }
              @for (tradeoff of score.tradeoffs; track tradeoff) {
                <li>{{ tradeoff }}</li>
              }
              @for (unknown of score.unknowns; track unknown) {
                <li><strong>Unverified requirement:</strong> {{ unknown }}</li>
              }
              @if (selectedPrinter()) {
                <li>
                  <strong>Printer family context:</strong>
                  {{ compatibility(score.material).reasons[0] }} Exact product
                  support still needs verification.
                </li>
              }
            </ul>
            <p>
              <a [href]="evidenceUrl(score.material)"
                >Read this profile's named product evidence</a
              >
            </p>
            <p>
              <a
                [routerLink]="routeUrl.CompareMaterials"
                [queryParams]="{
                  left: score.material.id,
                  right: comparisonPartner(score.material.id),
                }"
                >Compare with another family</a
              >
            </p>
            <a [routerLink]="[routeUrl.Materials, score.material.slug]"
              >Read the full guide</a
            >
          </article>
        }
      </div>
    </section>
    <section>
      <h2>Trace the ranking to its basis</h2>
      <p>
        The score is ease plus three times the selected property band, minus 20
        for a rigid family when deliberate flexibility is required. Enclosure
        guidance adds a preparation caution rather than an automatic family
        exclusion. Bands are editorial ordinal choices for typical unfilled
        families; the spacing is not a measured physical scale. Heat ranking
        does not enter an operating temperature and cannot qualify a heated
        part. Outdoor ranking does not test sealing or UV lifetime.
      </p>
      <p>
        For a flexible bumper with no enclosure, TPU can match the flexibility
        priority while rigid PLA and PETG are flagged. For an outdoor cover
        without a suitable enclosure, ASA's exposure rationale does not remove
        the need to verify the exact product and available environment. For a
        rigid locator, use functional requirements and inspect deformation
        rather than choosing the flexible ranking.
      </p>
      <ul>
        @for (source of materialSources; track source.id) {
          <li>
            <a [href]="source.url">{{ source.title }}</a
            >: {{ source.publisher }}, checked {{ source.accessedAt }}.
          </li>
        }
      </ul>
    </section>
    <section>
      <h2>Why formulations and hardware matter</h2>
      <p>
        Base polymer names do not define every spool. Check the manufacturer
        profile, drying needs, build surface and printer documentation - maximum
        nozzle temperature alone is not proof of compatibility.
      </p>
    </section>
  </main>`,
})
export class MaterialSelectorPage {
  readonly materialList = materials;
  readonly hardware = HardwareEvidence;
  readonly productId = signal('');
  readonly nozzleEvidence = signal<HardwareEvidence>(HardwareEvidence.Unknown);
  readonly selectedProduct = computed(() =>
    materials.find((material) => material.id === this.productId()),
  );
  readonly constraints = computed(() =>
    productConstraints(
      this.selectedProduct()?.productExample,
      this.selectedPrinter(),
      this.hasEnclosure(),
      this.nozzleEvidence(),
    ),
  );
  readonly evidenceUrl = materialEvidenceUrl;
  comparisonPartner(id: MaterialId) {
    const pair = materialComparisons.find(
      (pair) => pair.materialAId === id || pair.materialBId === id,
    )!;
    return pair.materialAId === id ? pair.materialBId : pair.materialAId;
  }
  readonly routeUrl = PublicRouteUrl;
  readonly materialSources = materialSources;
  readonly choices = [
    { value: UseCase.Visual, label: 'Visual prototype' },
    { value: UseCase.Functional, label: 'Everyday functional part' },
    { value: UseCase.Outdoor, label: 'Outdoor part' },
    { value: UseCase.Heat, label: 'Heat-exposed part' },
    { value: UseCase.Flexible, label: 'Flexible part' },
    { value: UseCase.Impact, label: 'Impact-prone part' },
  ] as const;
  readonly useCase = signal<UseCase>(UseCase.Visual);
  readonly hasEnclosure = signal(false);
  readonly printerId = signal('');
  readonly publishedPrinters = printers.filter(
    (printer) => printer.published !== false,
  );
  readonly selectedPrinter = computed(() =>
    this.publishedPrinters.find((printer) => printer.id === this.printerId()),
  );
  readonly ranked = computed(() =>
    materials
      .map((material) =>
        scoreMaterial(material, this.useCase(), this.hasEnclosure()),
      )
      .filter(
        (score) =>
          score.blockers.length === 0 &&
          !(
            score.material.id === this.productId() &&
            this.constraints().constraints.length
          ),
      )
      .sort(
        (a, b) =>
          b.total - a.total ||
          a.material.displayName.localeCompare(b.material.displayName),
      )
      .slice(0, 3),
  );
  constructor() {
    inject(SeoService).apply({
      title:
        '3D Printing Material Selector - Choose the Right Filament | InspectMesh',
      description:
        'Rank filament material families using explicit use-case priorities and practical setup cautions.',
      path: PublicRouteUrl.MaterialSelector,
    });
  }

  compatibility(material: (typeof materials)[number]) {
    const result = compatibilityFor(this.selectedPrinter(), material);
    if (result.verdict === CompatibilityVerdict.NotRecommended) {
      return {
        ...result,
        verdict: CompatibilityVerdict.Unknown,
        reasons: [
          'Family guidance suggests checking the environment; no exact product requirement has been established by this family-only check.',
        ],
      };
    }
    return result;
  }
}

@Component({
  selector: 'app-material-compare',
  imports: [RouterLink, MaterialProductComparisonComponent],
  styleUrl: './material-pages.scss',
  template: `<main class="page material-page material-compare-page">
    <p class="eyebrow">Interactive material comparison</p>
    <h1>Compare 3D Printing Materials</h1>
    <p class="lead">
      Compare setup and family characteristics, then use a dedicated pair guide
      for the requirements and tradeoffs that determine your part.
    </p>
    <section class="card material-form-card material-compare-form">
      <label
        >First material
        <select
          [value]="leftId()"
          (change)="leftId.set($any($event.target).value)"
        >
          <option value="" disabled>Choose a valid family</option>
          @for (material of materialList; track material.id) {
            <option [value]="material.id">{{ material.displayName }}</option>
          }
        </select></label
      ><label
        >Second material
        <select
          [value]="rightId()"
          (change)="rightId.set($any($event.target).value)"
        >
          <option value="" disabled>Choose a valid family</option>
          @for (material of materialList; track material.id) {
            <option [value]="material.id">{{ material.displayName }}</option>
          }
        </select></label
      >
    </section>
    @if (!left() || !right()) {
      <p role="alert">
        The URL contains an unknown material ID. Choose valid families above; no
        unrelated product has been substituted.
      </p>
    }
    @if (left() && right()) {
      <section>
        <h2>{{ left().displayName }} and {{ right().displayName }}</h2>
        <div
          class="material-table-scroll"
          tabindex="0"
          role="region"
          aria-label="Material comparison table"
        >
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
                <th scope="row">Reason to investigate</th>
                <td>{{ left().bestFor.join(', ') }}</td>
                <td>{{ right().bestFor.join(', ') }}</td>
              </tr>
              <tr>
                <th scope="row">Preparation</th>
                <td>{{ preparation[left().id].surface }}</td>
                <td>{{ preparation[right().id].surface }}</td>
              </tr>
              <tr>
                <th scope="row">Decision to resolve</th>
                <td>{{ preparation[left().id].question }}</td>
                <td>{{ preparation[right().id].question }}</td>
              </tr>
              <tr>
                <th scope="row">Poor fit</th>
                <td>{{ left().poorFitFor.join(', ') }}</td>
                <td>{{ right().poorFitFor.join(', ') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <a [routerLink]="[routeUrl.Materials, left().slug]"
            >{{ left().displayName }} guide</a
          >
          ·
          <a [routerLink]="[routeUrl.Materials, right().slug]"
            >{{ right().displayName }} guide</a
          >
        </p>
        @if (pair(); as selectedPair) {
          <p>
            <a [routerLink]="[comparisonBase, selectedPair.slug]"
              >Read the curated decision for this pair</a
            >
          </p>
        }
      </section>
      <app-material-product-comparison [left]="left()" [right]="right()" />
    }
    <section>
      <h2>Compare the requirement, then the family</h2>
      <p>
        Select two families to inspect their setup expectations. The numerical
        bands are editorial candidate-ordering aids, not tested temperatures,
        loads or universal performance scores. For a 40 mm locating plate versus
        a flexible bumper, rigidity and loaded deformation answer different
        questions: compare PLA/TPU rather than treating a higher band as better
        overall.
      </p>
      <p>
        For heat, moisture, chemical or outdoor use, obtain the exact
        formulation datasheet and actual exposure conditions. This comparison
        runs locally and does not upload a model.
        <a [href]="materialComparisonUrl.PlaVsTpu"
          >Read the rigid-versus-flexible decision</a
        >
        or
        <a [href]="materialComparisonUrl.PetgVsAsa">review an outdoor cover</a>.
      </p>
    </section>
  </main>`,
})
export class MaterialComparisonPage {
  readonly preparation = materialPreparation;
  readonly comparisonBase = `/${PublicRouteSegment.MaterialComparisons}`;
  readonly pair = computed(() =>
    materialComparisons.find(
      (pair) =>
        (pair.materialAId === this.leftId() &&
          pair.materialBId === this.rightId()) ||
        (pair.materialAId === this.rightId() &&
          pair.materialBId === this.leftId()),
    ),
  );
  readonly routeUrl = PublicRouteUrl;
  readonly materialComparisonUrl = MaterialComparisonRouteUrl;
  readonly materialIds = MaterialId;
  readonly materialList = materials;
  readonly leftId = signal<MaterialId | ''>(MaterialId.Pla);
  readonly rightId = signal<MaterialId | ''>(MaterialId.Petg);
  readonly left = computed(() =>
    materials.find((material) => material.id === this.leftId())!,
  );
  readonly right = computed(() =>
    materials.find((material) => material.id === this.rightId())!,
  );
  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const pair = parseMaterialPair(params.get('left'), params.get('right'));
        this.leftId.set(pair.left);
        this.rightId.set(pair.right);
      });
    inject(SeoService).apply({
      title: 'Compare 3D Printing Materials | InspectMesh',
      description:
        'Compare practical filament setup needs and editorial property bands for two material families.',
      path: PublicRouteUrl.CompareMaterials,
    });
  }
}
