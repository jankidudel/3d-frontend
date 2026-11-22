import { usePageBreadcrumbs } from '../../core/components/breadcrumbs/breadcrumbs';
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
import {
  CompatibilityVerdict,
  compatibilityFor,
  materials,
} from '../materials/material-catalogue';
import type { PrinterRecord } from './printer-catalogue';

const CUBIC_MM_PER_LITRE = 1_000_000;
const SQUARE_MM_PER_CM2 = 100;
/** Neighbouring printers listed in each size direction. */
const NEIGHBOUR_LIMIT = 3;
const MATERIAL_GROUP_ORDER = [
  CompatibilityVerdict.DocumentedSupported,
  CompatibilityVerdict.NotRecommended,
  CompatibilityVerdict.Unknown,
] as const;

function nominalVolume(printer: PrinterRecord): number {
  const [x, y, z] = printer.buildVolumeMm;
  return x * y * z;
}

function formatOneDecimal(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

@Component({
  selector: 'app-printer-hub-page',
  imports: [RouterLink],
  styleUrl: './printer-pages.scss',
  template: `<main class="page printer-hub-page">
    <p class="eyebrow">Printer research</p>
    <h1>3D Printer Build Volumes and Specifications</h1>
    <p class="lead">
      Nominal build volumes, enclosure, temperatures and sourced specifications
      for {{ filtered().length }} popular FDM printers, each linked to a local
      fit check for your STL or 3MF.
    </p>
    <section>
      <h2>Fit the model, then research the printer</h2>
      <p>
        An illustrative 250 x 210 x 180 mm box fails a nominal 180 mm cube but
        fits a nominal 256 mm cube. Check
        <a [routerLink]="routeUrl.PrinterFitChecker"
          >your STL or 3MF against named volumes</a
        >, then compare enclosure, exact material profiles, workspace and
        regional purchase details.
      </p>
    </section>
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
    <section id="methodology">
      <h2>How these printer pages are researched</h2>
      <ul>
        <li>
          Specifications come from the manufacturer pages linked on each printer
          page, with the date each source was checked. InspectMesh has not
          hands-on tested these printers and does not rank print quality, noise
          or reliability.
        </li>
        <li>
          Build volumes are nominal. Bed exclusions, brims, supports and slicer
          restrictions can reduce the usable space, so treat a fit with little
          clearance as a boundary case.
        </li>
        <li>
          The example fit uses a rigid 250 x 210 x 180 mm box tested in all six
          right-angle orientations against each nominal volume.
        </li>
        <li>
          Filament verdicts are conservative. "Listed in documentation" means
          the manufacturer names the family; "usually needs an enclosure" means
          the family normally benefits from one and the printer is open-frame;
          "not verified" means support for that exact printer, nozzle and
          formulation has not been confirmed. None of them covers filled or
          abrasive variants.
        </li>
        <li>
          Prices are dated USD snapshots, not current or regional offers. Check
          availability, tax and bundle contents with the manufacturer.
        </li>
      </ul>
    </section>
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
      title: '3D Printer Build Volumes and Specifications | InspectMesh',
      description:
        'Compare nominal build volumes, enclosure, temperatures and sourced specifications for popular FDM printers, then fit-check your own model.',
      path: PublicRouteUrl.Printers,
    });
  }
}

@Component({
  selector: 'app-printer-detail-page',
  imports: [RouterLink, ProductLinkComponent],
  styleUrl: './printer-pages.scss',
  template: `<main class="page printer-detail-page">
    <h1>{{ printer().displayName }} Build Volume and Specifications</h1>
    <p class="lead">
      The {{ printer().displayName }} has a nominal build volume of
      {{ printer().buildVolumeMm.join(' x ') }} mm ({{
        volume().litres
      }}
      litres) on {{ printer().enclosed ? 'an enclosed' : 'an open' }} frame.
      {{ printer().summary }}
    </p>
    <p><strong>Best for:</strong> {{ printer().bestFor }}</p>
    <section>
      <h2>Build volume in practice</h2>
      <ul>
        <li>
          Bed area: {{ volume().bedAreaCm2 }} cm² ({{
            printer().buildVolumeMm[0]
          }}
          x {{ printer().buildVolumeMm[1] }} mm).
        </li>
        <li>
          Bed diagonal: about {{ volume().diagonalMm }} mm. A thin, flat part up
          to roughly that length can only fit if it lies corner to corner, and
          brims or bed exclusions reduce it further.
        </li>
        <li>Maximum nominal height: {{ printer().buildVolumeMm[2] }} mm.</li>
        <li>
          Rank in this catalogue: {{ volume().rank }} of
          {{ volume().total }} printers by nominal build volume.
        </li>
      </ul>
      @if (printer().dimensionsNote) {
        <p>{{ printer().dimensionsNote }}</p>
      }
      @if (fitExample(); as example) {
        <h3>Example: a 250 x 210 x 180 mm box</h3>
        <p>{{ example }}</p>
      }
      @if (largerPrinters().length) {
        <p>
          Need more room? Larger nominal volumes in this catalogue:
          @for (other of largerPrinters(); track other.id; let last = $last) {
            <a [routerLink]="[routeUrl.Printers, other.slug]">{{
              other.displayName
            }}</a>
            ({{ other.buildVolumeMm.join(' x ') }} mm){{ last ? '.' : ',' }}
          }
        </p>
      }
      @if (smallerPrinters().length) {
        <p>
          Smaller nominal volumes:
          @for (other of smallerPrinters(); track other.id; let last = $last) {
            <a [routerLink]="[routeUrl.Printers, other.slug]">{{
              other.displayName
            }}</a>
            ({{ other.buildVolumeMm.join(' x ') }} mm){{ last ? '.' : ',' }}
          }
        </p>
      }
      <a
        class="button"
        [routerLink]="[routeUrl.PrinterFitChecker]"
        [queryParams]="{ printer: printer().id }"
        >Check an STL or 3MF against {{ printer().displayName }}</a
      >
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
            <th scope="row">Manufacturer-claimed maximum speed</th>
            <td>{{ formatNumber(printer().maxClaimedSpeedMmS, 'mm/s') }}</td>
          </tr>
          @if (printer().camera) {
            <tr>
              <th scope="row">Camera</th>
              <td>{{ printer().camera }}</td>
            </tr>
          }
          @if (printer().multicolour) {
            <tr>
              <th scope="row">Multicolour</th>
              <td>{{ printer().multicolour }}</td>
            </tr>
          }
          @if (printer().materials) {
            <tr>
              <th scope="row">Manufacturer material list</th>
              <td>{{ printer().materials }}</td>
            </tr>
          }
          <tr>
            <th scope="row">Historical USD price snapshot</th>
            <td>
              {{
                printer().indicativeUsdPrice
                  ? '$' + printer().indicativeUsdPrice
                  : 'Not confirmed'
              }}
              (checked {{ printer().lastVerified }}; not a current offer)
            </td>
          </tr>
        </tbody>
      </table>
    </section>
    <section>
      <h2>Which filament families it suits</h2>
      @if (printer().slug === printerSlug.BambuLabP1S) {
        <p>
          The source specification distinguishes ideal material families from PA
          and PC capability. Unknown below means the exact formulation and
          installed hardware are not documented, not that the specification
          forbids the family.
        </p>
      }
      <ul>
        @for (group of materialGroups(); track group.verdict) {
          <li>
            <strong>{{ group.label }}:</strong>{{ ' ' }}
            @for (
              material of group.materials;
              track material.id;
              let last = $last
            ) {
              <a [routerLink]="[routeUrl.Materials, material.slug]">{{
                material.displayName
              }}</a
              >{{ last ? '.' : ',' }}
            }
          </li>
        }
      </ul>
      <p>
        <a [routerLink]="routeUrl.MaterialSelector"
          >Choose a material for your part</a
        >
        or read
        <a [routerLink]="routeUrl.Printers" fragment="methodology"
          >how these verdicts are decided</a
        >.
      </p>
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
    @if (comparisons().length) {
      <section>
        <h2>Compare the {{ printer().displayName }}</h2>
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
    }
    <section>
      <h2>Sources</h2>
      <p>
        Specifications checked {{ printer().lastVerified }}. Individual source
        checks are dated below.
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
    @if (fitExample()) {
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
  private readonly publishedPrinters = printers.filter(
    (printer) => printer.published !== false,
  );
  readonly volume = computed(() => {
    const [x, y, z] = this.printer().buildVolumeMm;
    const ranked = [...this.publishedPrinters].sort(
      (left, right) => nominalVolume(right) - nominalVolume(left),
    );
    return {
      litres: formatOneDecimal((x * y * z) / CUBIC_MM_PER_LITRE),
      bedAreaCm2: Math.round((x * y) / SQUARE_MM_PER_CM2),
      diagonalMm: Math.round(Math.hypot(x, y)),
      rank: ranked.findIndex((other) => other.id === this.printer().id) + 1,
      total: ranked.length,
    };
  });
  readonly largerPrinters = computed(() =>
    this.publishedPrinters
      .filter((other) => nominalVolume(other) > nominalVolume(this.printer()))
      .sort((left, right) => nominalVolume(left) - nominalVolume(right))
      .slice(0, NEIGHBOUR_LIMIT),
  );
  readonly smallerPrinters = computed(() =>
    this.publishedPrinters
      .filter((other) => nominalVolume(other) < nominalVolume(this.printer()))
      .sort((left, right) => nominalVolume(right) - nominalVolume(left))
      .slice(0, NEIGHBOUR_LIMIT),
  );
  readonly comparisons = computed(() =>
    curatedComparisons.filter(
      (comparison) =>
        comparison.leftId === this.printer().id ||
        comparison.rightId === this.printer().id,
    ),
  );
  readonly materialGroups = computed(() =>
    MATERIAL_GROUP_ORDER.map((verdict) => ({
      verdict,
      label: this.materialGroupLabel(verdict),
      materials: materials.filter(
        (material) =>
          compatibilityFor(this.printer(), material).verdict === verdict,
      ),
    })).filter((group) => group.materials.length > 0),
  );

  private materialGroupLabel(verdict: CompatibilityVerdict): string {
    const name = this.printer().displayName;
    switch (verdict) {
      case CompatibilityVerdict.DocumentedSupported: {
        return `Listed in ${name} documentation`;
      }
      case CompatibilityVerdict.NotRecommended: {
        return 'Usually need an enclosure, which this open-frame printer lacks';
      }
      case CompatibilityVerdict.Unknown: {
        return `Not verified for the ${name} yet`;
      }
      default: {
        return verdict;
      }
    }
  }
  constructor() {
    const printer = this.printer();
    inject(SeoService).apply({
      title: `${printer.displayName} Build Volume and Specs | InspectMesh`,
      description:
        printer.summary ?? `${printer.displayName} specification overview.`,
      path: `/3d-printers/${printer.slug}`,
      openGraphType: 'article',
    });
    usePageBreadcrumbs([
      { label: '3D Printers', href: PublicRouteUrl.Printers },
      {
        label: printer.displayName,
        href: `${PublicRouteUrl.Printers}/${printer.slug}`,
      },
    ]);
  }
}
