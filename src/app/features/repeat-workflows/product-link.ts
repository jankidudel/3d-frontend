import { Component, inject, input, signal } from '@angular/core';
import {
  AnalyticsEvent,
  AnalyticsService,
} from '../../core/analytics/analytics.service';

export const ProductRelationship = {
  Manufacturer: 'manufacturer',
  Affiliate: 'affiliate',
} as const;
export type ProductRelationship =
  (typeof ProductRelationship)[keyof typeof ProductRelationship];
export const RetailerRegion = {
  Worldwide: 'worldwide',
  UK: 'UK',
  US: 'US',
  Canada: 'CA',
  Australia: 'AU',
  NewZealand: 'NZ',
  Ireland: 'IE',
  SouthAfrica: 'ZA',
} as const;
export type RetailerRegion =
  (typeof RetailerRegion)[keyof typeof RetailerRegion];
export interface ProductRecord {
  readonly id: string;
  readonly name: string;
  readonly reason: string;
  readonly compatibility: string;
  readonly source: string;
  readonly verified: string;
  readonly relationship: ProductRelationship;
  readonly links: Partial<Record<RetailerRegion, string>>;
}
export const ProductRecords = {
  Filament: {
    id: 'prusament-material-lookup',
    name: 'Prusament material guidance',
    reason:
      'If the spool is short, compare the exact material and diameter you already use before choosing a replacement.',
    compatibility:
      'Material reference only. Confirm filament diameter, printer profile, spool fit and local availability with the manufacturer.',
    source: 'https://help.prusa3d.com/article/filament-material-guide_2222',
    verified: '2026-10-04',
    relationship: ProductRelationship.Manufacturer,
    links: { [RetailerRegion.Worldwide]: 'https://prusament.com/materials/' },
  },
  Nozzle: {
    id: 'prusa-nozzle-profile-lookup',
    name: 'Prusa nozzle and profile lookup',
    reason:
      'Use your exact printer and hotend documentation when considering a nozzle change.',
    compatibility:
      'Lookup, not a fitment claim. Diameter and nozzle material do not establish thread, length or heater compatibility.',
    source:
      'https://help.prusa3d.com/article/creating-profiles-for-different-nozzles_127540',
    verified: '2026-10-04',
    relationship: ProductRelationship.Manufacturer,
    links: {
      [RetailerRegion.Worldwide]:
        'https://help.prusa3d.com/article/creating-profiles-for-different-nozzles_127540',
    },
  },
  Storage: {
    id: 'prusa-uss-drybox',
    name: 'Prusa USS Drybox documentation',
    reason:
      'Review passive storage, spool dimensions and feeding arrangements before buying storage equipment.',
    compatibility:
      'USS Drybox is passive storage. It does not establish an active drying cycle or fit every spool.',
    source: 'https://help.prusa3d.com/article/prusa-uss-drybox_1014382',
    verified: '2026-10-04',
    relationship: ProductRelationship.Manufacturer,
    links: {
      [RetailerRegion.Worldwide]:
        'https://help.prusa3d.com/article/prusa-uss-drybox_1014382',
    },
  },
} satisfies Record<string, ProductRecord>;
const REGION_KEY = 'inspectmesh-retailer-region';

@Component({
  selector: 'app-product-link',
  template: `<aside class="product-card">
    <h2>{{ product().name }}</h2>
    <p>{{ product().reason }}</p>
    <label
      >Retailer region<select [value]="region()" (change)="choose($event)">
        @for (choice of regions; track choice[1]) {
          <option [value]="choice[1]">{{ choice[0] }}</option>
        }
      </select></label
    >
    <p>{{ product().compatibility }}</p>
    <p>
      Source verified {{ product().verified }}. No local stock, shipping or
      price is assumed.
    </p>
    @if (product().links[region()]; as link) {
      <a
        [href]="link"
        [rel]="
          product().relationship === relationships.Affiliate
            ? 'sponsored noopener noreferrer'
            : 'noopener noreferrer'
        "
        target="_blank"
        (click)="track()"
        >Open manufacturer or retailer reference</a
      >
    } @else {
      <p>No verified retailer link for this region.</p>
      @if (product().links[worldwide]; as link) {
        <a
          [href]="link"
          rel="noopener noreferrer"
          target="_blank"
          (click)="track()"
          >Use the manufacturer's worldwide lookup</a
        >
      }
    }
    <p>
      {{
        product().relationship === relationships.Affiliate
          ? 'Affiliate link: InspectMesh may earn a commission from qualifying purchases.'
          : 'Ordinary manufacturer referral. No affiliate commission is configured for this link.'
      }}
    </p>
  </aside>`,
  styles: [
    `
      .product-card {
        border: 1px solid #cbd5e1;
        border-radius: 1rem;
        padding: 1.5rem;
        margin-block: 1.5rem;
      }
      label {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
      }
      select {
        font: inherit;
        min-height: 2.75rem;
      }
    `,
  ],
})
export class ProductLinkComponent {
  readonly product = input.required<ProductRecord>();
  readonly relationships = ProductRelationship;
  readonly worldwide = RetailerRegion.Worldwide;
  readonly regions = Object.entries(RetailerRegion).map(
    ([label, value]) =>
      [
        label === 'NewZealand'
          ? 'New Zealand'
          : label === 'SouthAfrica'
            ? 'South Africa'
            : label,
        value,
      ] as const,
  );
  readonly region = signal<RetailerRegion>(RetailerRegion.Worldwide);
  private readonly analytics = inject(AnalyticsService);
  constructor() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(REGION_KEY);
        if (Object.values(RetailerRegion).includes(saved as RetailerRegion)) {
          this.region.set(saved as RetailerRegion);
        }
      }
    } catch {
      // Preferences are optional when browser storage is disabled.
    }
  }
  choose(event: Event): void {
    const region = (event.target as HTMLSelectElement).value as RetailerRegion;
    this.region.set(region);
    try {
      localStorage.setItem(REGION_KEY, region);
    } catch {
      // The selected region still works for this view.
    }
  }
  track(): void {
    this.analytics.trackWorkflow(
      this.product().relationship === ProductRelationship.Affiliate
        ? AnalyticsEvent.AffiliateLinkClicked
        : AnalyticsEvent.ManufacturerLinkClicked,
      this.product().id,
      this.region(),
    );
  }
}
