import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { SeoService } from '../../core/seo/seo.service';
import { curatedComparisons } from './comparison-catalogue';
import { printers, printersBySlug } from './printer-catalogue';
import { compatibilityFor, materials } from '../materials/material-catalogue';

@Component({
  selector: 'app-printer-hub-page',
  imports: [RouterLink],
  styleUrl: './printer-pages.scss',
  template: `<main class="page printer-hub-page">
    <p class="eyebrow">Printer research</p>
    <h1>3D Printers</h1>
    <p class="lead">
      Specification-led printer pages with build-volume fit links. InspectMesh
      has not hands-on tested the listed printers.
    </p>
    <label class="field"
      ><span>Filter printer models</span
      ><input
        type="search"
        (input)="filter.set($any($event.target).value)"
        placeholder="Manufacturer or model"
    /></label>
    <div class="tool-grid">
      @for (printer of filtered(); track printer.id) {
        <article class="tool-card card">
          <h2>{{ printer.displayName }}</h2>
          <p>{{ printer.summary }}</p>
          <p>
            <strong>Build volume:</strong>
            {{ printer.buildVolumeMm.join(' x ') }} mm
          </p>
          <p><strong>Best for:</strong> {{ printer.bestFor }}</p>
          <a class="button" [routerLink]="['/3d-printers', printer.slug]"
            >View specifications</a
          >
        </article>
      }
    </div>
  </main>`,
})
export class PrinterHubPage {
  readonly filter = signal('');
  readonly filtered = computed(() => {
    const query = this.filter().trim().toLowerCase();
    return printers.filter(
      (printer) =>
        printer.published !== false &&
        (!query ||
          `${printer.displayName} ${printer.bestFor}`
            .toLowerCase()
            .includes(query)),
    );
  });
  constructor() {
    inject(SeoService).apply({
      title: '3D Printer Specifications and Fit Checker | InspectMesh',
      description:
        'Browse researched 3D printer specifications, build volumes and direct links to the local STL and 3MF fit checker.',
      path: PublicRouteUrl.Printers,
    });
  }
}

@Component({
  selector: 'app-printer-detail-page',
  imports: [RouterLink],
  styleUrl: './printer-pages.scss',
  template: `<main class="page printer-detail-page">
    <p class="breadcrumbs">
      <a [routerLink]="routeUrl.Printers">3D Printers</a> /
      {{ printer().displayName }}
    </p>
    <h1>{{ printer().displayName }}: Specs, Build Volume and Fit Checker</h1>
    <p class="lead">{{ printer().summary }}</p>
    <p><strong>Best for:</strong> {{ printer().bestFor }}</p>
    <p>
      <strong>Status:</strong> {{ printer().status }}.
      <strong>Editorial basis:</strong> specification research, not a hands-on
      review.
    </p>
    <section>
      <h2>Material compatibility guidance</h2>
      <p>
        These are conservative, evidence-led starting points. They do not
        promise compatibility with every formulation, filled variant or spool.
      </p>
      <ul>
        @for (material of materialCompatibility(); track material.id) {
          <li>
            <a [routerLink]="['/3d-printing-materials', material.slug]">{{
              material.displayName
            }}</a>
            - {{ material.verdict }}: {{ material.reason }}
          </li>
        }
      </ul>
      <a [routerLink]="routeUrl.MaterialSelector">Use the material selector</a>
    </section>
    <section>
      <h2>Key specifications</h2>
      <table>
        <tbody>
          <tr>
            <th scope="row">Build volume</th>
            <td>{{ printer().buildVolumeMm.join(' x ') }} mm</td>
          </tr>
          <tr>
            <th scope="row">Enclosure</th>
            <td>{{ printer().enclosed ? 'Enclosed' : 'Open frame' }}</td>
          </tr>
          <tr>
            <th scope="row">Maximum nozzle temperature</th>
            <td>{{ printer().maxNozzleTemperatureC }} C</td>
          </tr>
          <tr>
            <th scope="row">Maximum bed temperature</th>
            <td>{{ printer().maxBedTemperatureC }} C</td>
          </tr>
          <tr>
            <th scope="row">Indicative US price</th>
            <td>
              {{
                printer().indicativeUsdPrice
                  ? '$' + printer().indicativeUsdPrice
                  : 'Not confirmed'
              }}
              - checked {{ printer().lastVerified }}
            </td>
          </tr>
        </tbody>
      </table>
      <p>
        Indicative prices are not offers. Verify availability, tax, bundle
        contents and current price with the manufacturer.
      </p>
    </section>
    <section>
      <h2>Build-volume fit</h2>
      <p>
        Use this printer's nominal build volume in the local fit checker.
        Confirm reduced usable regions and slicer-specific restrictions before
        printing.
      </p>
      <a
        class="button"
        [routerLink]="[routeUrl.PrinterFitChecker]"
        [queryParams]="{ printer: printer().id }"
        >Check an STL or 3MF against {{ printer().displayName }}</a
      >
    </section>
    <section>
      <h2>Strengths and limitations</h2>
      <h3>Potential strengths</h3>
      <ul>
        @for (item of printer().strengths; track item) {
          <li>{{ item }}</li>
        }
      </ul>
      <h3>Important limitations</h3>
      <ul>
        @for (item of printer().limitations; track item) {
          <li>{{ item }}</li>
        }
      </ul>
    </section>
    <section>
      <h2>Running cost</h2>
      <p>
        Job cost depends on material, waste, print time, electricity and
        failures, not a stated maximum speed.
      </p>
      <a [routerLink]="routeUrl.PrintCostCalculator"
        >Open the 3D Print Cost Calculator</a
      >
    </section>
    <section>
      <h2>Relevant comparisons</h2>
      <ul>
        @for (comparison of comparisons(); track comparison.slug) {
          <li>
            <a [routerLink]="['/compare', comparison.slug]">{{
              comparison.title
            }}</a>
          </li>
        }
      </ul>
    </section>
    <section>
      <h2>Sources and methodology</h2>
      <p>
        Last verified: {{ printer().lastVerified }}. InspectMesh summarises
        attributable specification sources and has not physically tested this
        unit.
      </p>
      <ul>
        @for (source of printer().sources; track source.url) {
          <li>
            <a [href]="source.url" target="_blank" rel="noopener noreferrer"
              >{{ source.label }} ({{ source.lastVerified }})</a
            >
          </li>
        }
      </ul>
    </section>
  </main>`,
})
export class PrinterDetailPage {
  readonly routeUrl = PublicRouteUrl;
  private readonly slug = inject(Router).url.split('/').at(-1) ?? '';
  readonly printer = computed(() => {
    const printer = printersBySlug.get(this.slug);
    if (!printer || printer.published === false) {
      throw new Error('Unknown published printer');
    }
    return printer;
  });
  readonly comparisons = computed(() =>
    curatedComparisons.filter(
      (comparison) =>
        comparison.leftId === this.printer().id ||
        comparison.rightId === this.printer().id,
    ),
  );
  readonly materialCompatibility = computed(() =>
    materials.map((material) => {
      const result = compatibilityFor(this.printer(), material);
      return {
        id: material.id,
        slug: material.slug,
        displayName: material.displayName,
        verdict: result.verdict,
        reason: result.reasons[0],
      };
    }),
  );
  constructor() {
    const printer = this.printer();
    inject(SeoService).apply({
      title: `${printer.displayName}: Specs, Build Volume and Fit Checker | InspectMesh`,
      description:
        printer.summary ?? `${printer.displayName} specification overview.`,
      path: `/3d-printers/${printer.slug}`,
      openGraphType: 'article',
    });
  }
}
