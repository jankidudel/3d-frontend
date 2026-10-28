import {
  formatPrinterDimensions,
  formatPrinterNumber,
} from './printer-spec-format';
import {
  ProductLinkComponent,
  ProductRelationship,
  RetailerRegion,
  ProductRecord,
} from '../repeat-workflows/product-link';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PrinterSlug, PublicRouteUrl } from '../../core/seo/public-routes';
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
    <section>
      <h2>Fit the model, then research the printer</h2>
      <p>
        An illustrative 250 × 210 × 180 mm box fails a nominal 180 mm cube but
        fits a nominal 256 mm cube. That explains a useful size distinction,
        without proving usable brim clearance or choosing a printer by speed
        claims.
      </p>
      <p>
        Check
        <a [routerLink]="routeUrl.PrinterFitChecker"
          >your STL or 3MF against named volumes</a
        >, then compare enclosure, exact material profiles, workspace and
        regional purchase details. This catalogue uses specification research
        rather than hands-on quality, reliability or noise rankings. Dated
        indicative prices are explicit currency snapshots, not live regional
        offers.
      </p>
    </section>

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
  readonly routeUrl = PublicRouteUrl;
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
  imports: [RouterLink, ProductLinkComponent],
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
      @if (printer().slug === printerSlug.BambuLabP1S) {
        <p>
          The source specification distinguishes ideal material families from PA
          and PC capability. The conservative list below additionally asks
          whether the exact formulation and installed hardware are documented.
          An unknown verdict is a request for that evidence, not a claim that
          the specification forbids the family. Filled variants and automatic
          filament feeding need their own checks.
        </p>
      }
      <p>
        These are conservative, evidence-led starting points. They do not
        promise compatibility with every formulation, filled variant or spool.
      </p>
      <ul>
        @for (material of materialCompatibility(); track material.id) {
          <li>
            <a [routerLink]="[routeUrl.Materials, material.slug]">{{
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
            <th scope="row">Physical machine dimensions</th>
            <td>{{ formatDimensions(printer().machineDimensionsMm) }}</td>
          </tr>
          <tr>
            <th scope="row">Enclosure</th>
            <td>{{ printer().enclosed ? 'Enclosed' : 'Open frame' }}</td>
          </tr>
          <tr>
            <th scope="row">Maximum nozzle temperature</th>
            <td>{{ formatNumber(printer().maxNozzleTemperatureC, 'C') }}</td>
          </tr>
          <tr>
            <th scope="row">Maximum bed temperature</th>
            <td>{{ formatNumber(printer().maxBedTemperatureC, 'C') }}</td>
          </tr>
          <tr>
            <th scope="row">Historical USD price snapshot</th>
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
      <p>{{ printer().dimensionsNote }}</p>
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
        Catalogue baseline: {{ printer().lastVerified }}. Individual source
        checks are dated below. InspectMesh summarises attributable
        specification sources and has not physically tested this unit.
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
    @if (fitExample(); as example) {
      <section>
        <h2>A reproducible nominal-fit decision</h2>
        <p>{{ example }}</p>
        <p>
          The example model is a 250 × 210 × 180 mm rigid box. All six
          right-angle axis permutations are tested against the catalogue's
          nominal dimensions. A box pass leaves slicer bed exclusions, brims,
          supports and physical assembly unresolved. Scaling a helmet to fit a
          printer also changes wearer fit; splitting needs joint and clearance
          planning.
        </p>
        <p>
          <a
            [routerLink]="routeUrl.PrinterFitChecker"
            [queryParams]="{ printer: printer().id }"
            >Check your own STL or 3MF with this profile</a
          >
          or
          <a [routerLink]="routeUrl.BatchStlChecker"
            >record nominal fit for a collection</a
          >. No quality, noise or reliability ranking is inferred from these
          specifications.
        </p>
      </section>
      <app-product-link [product]="productReferral()" />
    }
  </main>`,
})
export class PrinterDetailPage {
  readonly printerSlug = PrinterSlug;
  readonly formatDimensions = formatPrinterDimensions;
  readonly formatNumber = formatPrinterNumber;
  readonly fitExample = computed(() => {
    const id = this.printer().id;
    const examples: Record<string, string> = {
      'bambu-lab-a1-mini':
        'The 250 mm axis exceeds every 180 mm axis in the nominal A1 Mini cube, so no tested right-angle orientation fits. Compare a split into separate parts before changing the real-world scale.',
      'bambu-lab-a1':
        'The example fits the nominal 256 × 256 × 256 mm A1 box in its original axis order. The 250 mm axis leaves only 6 mm nominal total clearance, so a brim or slicer exclusion can change practicality.',
      'bambu-lab-p1s':
        'The example fits the nominal 256 mm cube, but that fit alone does not decide between an enclosed P1S and an open-frame printer. Match the exact material environment and job requirements separately.',
      'bambu-lab-p2s':
        'The 250 x 210 x 180 mm example fits the P2S nominal cube with 6 mm total clearance on the longest axis. Changing from a P1S does not increase this capacity; compare nozzle handling and monitoring needs instead.',
      'bambu-lab-x1-carbon':
        'The example fits the X1 Carbon nominal cube, just as on the P-series 256 mm platforms. Sensors and accessories cannot make a larger footprint fit; assess those features separately from geometric capacity.',
      'prusa-core-one':
        'Place the 210 mm side across the CORE One 220 mm depth and the 250 mm side along its 250 mm width. This leaves zero total width allowance. A 260 mm-tall narrow part illustrates the different tradeoff: it is below the 270 mm nominal height but above a 256 mm cube.',
      'creality-k1c':
        'The example exceeds the K1C 220 mm horizontal axes in its original order. A right-angle turn placing the 250 mm side vertically reaches its 250 mm height exactly, with no height allowance. Confirm orientation and supports before treating this boundary as usable.',
      'elegoo-neptune-4-plus':
        'The example fits the Neptune 4 Plus nominal 320 x 320 x 385 mm box with 70 mm width and 110 mm depth allowance. A 300 x 280 mm panel illustrates why the larger bed can matter, but its flatness and bed-motion workspace need separate review.',
      'sovol-sv06-ace':
        'The 250 mm axis cannot lie across either 220 mm horizontal dimension. Turning it vertically reaches the 250 mm nominal height exactly. For a flat 230 x 200 mm panel, try the fit checker before assuming an axis-aligned layout will work.',
      'prusa-mk4s':
        'The example matches a nominal 250 × 210 × 220 mm MK4S box on two horizontal axes, leaving zero nominal XY clearance. Treat that equality as a boundary case: the real footprint, bed exclusions and brim can make the job unsuitable.',
    };
    return examples[id] ?? null;
  });
  readonly productReferral = computed<ProductRecord>(() => {
    const printer = this.printer();
    const usLink = printer.officialProductUrl.includes('us.store.');
    return {
      id: printer.id,
      name: printer.displayName + ' manufacturer reference',
      reason:
        'Check exact model, bundle and regional purchase options after reviewing the nominal fit.',
      compatibility:
        'Specification research, not physical testing. Confirm usable build regions and the exact supplied hotend/material profile.',
      source: printer.sources[0].url,
      verified: printer.lastVerified,
      relationship: ProductRelationship.Manufacturer,
      links: usLink
        ? {
            [RetailerRegion.US]: printer.officialProductUrl,
            [RetailerRegion.Worldwide]: 'https://bambulab.com/en/compare',
          }
        : { [RetailerRegion.Worldwide]: printer.officialProductUrl },
    };
  });

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
