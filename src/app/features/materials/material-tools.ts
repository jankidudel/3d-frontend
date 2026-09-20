import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { printers } from '../printer-comparison/printer-catalogue';
import { compatibilityFor, MaterialId, materials } from './material-catalogue';

const UseCase = {
  Visual: 'visual',
  Functional: 'functional',
  Outdoor: 'outdoor',
  Heat: 'heat',
  Flexible: 'flexible',
  Impact: 'impact',
} as const;
type UseCase = (typeof UseCase)[keyof typeof UseCase];
type Score = Readonly<{
  material: (typeof materials)[number];
  total: number;
  reasons: readonly string[];
  blockers: readonly string[];
  tradeoffs: readonly string[];
}>;
function scoreMaterial(
  material: (typeof materials)[number],
  useCase: UseCase,
  enclosure: boolean,
): Score {
  const reasons: string[] = [];
  const blockers: string[] = [];
  const tradeoffs: string[] = [];
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
    reasons.push(`Its ${useCase} band is a strong match.`);
  } else if (rating <= 2) {
    tradeoffs.push(`Its ${useCase} band is a weak fit for this priority.`);
  }
  if (material.enclosure === 'usually' && !enclosure) {
    blockers.push('This material usually needs a controlled enclosure.');
    total -= 20;
  }
  if (material.drying === 'high') {
    tradeoffs.push('Drying and careful storage are typically important.');
  }
  return { material, total, reasons, blockers, tradeoffs };
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
        <legend>What is the primary need?</legend>
        <select
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
    <section aria-live="polite">
      <h2>Suggested starting points</h2>
      <p>
        Weights favour the selected use case (3 points per editorial band) and
        ease of printing (1 point). Enclosure-dependent materials receive a hard
        blocker when no enclosure is available.
      </p>
      <div class="tool-grid material-card-grid material-result-grid">
        @for (score of ranked(); track score.material.id; let rank = $index) {
          <article class="card tool-card">
            <h3>{{ rank + 1 }}. {{ score.material.displayName }}</h3>
            <p>{{ score.material.summary }}</p>
            <ul>
              @for (reason of score.reasons; track reason) {
                <li>{{ reason }}</li>
              }
              @for (blocker of score.blockers; track blocker) {
                <li><strong>Blocker:</strong> {{ blocker }}</li>
              }
              @for (tradeoff of score.tradeoffs; track tradeoff) {
                <li>{{ tradeoff }}</li>
              }
              @if (selectedPrinter()) {
                <li>
                  <strong>Printer check:</strong>
                  {{ compatibility(score.material).verdict }} -
                  {{ compatibility(score.material).reasons[0] }}
                </li>
              }
            </ul>
            <a [routerLink]="['/3d-printing-materials', score.material.slug]"
              >Read the full guide</a
            >
          </article>
        }
      </div>
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
  readonly routeUrl = PublicRouteUrl;
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
    return compatibilityFor(this.selectedPrinter(), material);
  }
}

@Component({
  selector: 'app-material-compare',
  imports: [RouterLink],
  styleUrl: './material-pages.scss',
  template: `<main class="page material-page material-compare-page">
    <p class="eyebrow">Interactive material comparison</p>
    <h1>Compare 3D Printing Materials</h1>
    <p class="lead">
      Compare two published material families. Query choices are local UI state;
      the clean route remains canonical.
    </p>
    <section class="card material-form-card material-compare-form">
      <label
        >First material
        <select
          [value]="leftId()"
          (change)="leftId.set($any($event.target).value)"
        >
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
          @for (material of materialList; track material.id) {
            <option [value]="material.id">{{ material.displayName }}</option>
          }
        </select></label
      >
    </section>
    <section>
      <h2>{{ left().displayName }} and {{ right().displayName }}</h2>
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
            <th scope="row">Flexibility</th>
            <td>{{ left().ratings.flexibility }}/5</td>
            <td>{{ right().ratings.flexibility }}/5</td>
          </tr>
          <tr>
            <th scope="row">Heat</th>
            <td>{{ left().ratings.heat }}/5</td>
            <td>{{ right().ratings.heat }}/5</td>
          </tr>
        </tbody>
      </table>
      <p>
        <a [routerLink]="['/3d-printing-materials', left().slug]"
          >{{ left().displayName }} guide</a
        >
        ·
        <a [routerLink]="['/3d-printing-materials', right().slug]"
          >{{ right().displayName }} guide</a
        >
      </p>
    </section>
  </main>`,
})
export class MaterialComparisonPage {
  readonly materialList = materials;
  readonly leftId = signal<MaterialId>(MaterialId.Pla);
  readonly rightId = signal<MaterialId>(MaterialId.Petg);
  readonly left = computed(() =>
    materials.find((material) => material.id === this.leftId())!,
  );
  readonly right = computed(() =>
    materials.find((material) => material.id === this.rightId())!,
  );
  constructor() {
    inject(SeoService).apply({
      title: 'Compare 3D Printing Materials | InspectMesh',
      description:
        'Compare practical filament setup needs and editorial property bands for two material families.',
      path: PublicRouteUrl.CompareMaterials,
    });
  }
}
