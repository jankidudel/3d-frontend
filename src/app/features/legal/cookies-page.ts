import { Component, inject } from '@angular/core';
import { CookieConsentService } from '../../core/analytics/cookie-consent.service';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'app-cookies-page',
  styleUrl: './legal-page.scss',
  template: `
    <main class="page legal-page">
      <p class="eyebrow">Your choices</p>
      <h1>Cookies</h1>
      <p>
        Analytics cookies are optional. If accepted, Google Analytics helps us
        measure usage patterns such as page views and whether the STL checking
        flow succeeds or fails.
      </p>
      <p>
        Google Analytics is not loaded and no analytics events are sent before
        you accept. You can reject analytics or change your choice at any time.
      </p>
      <button class="button button-secondary" type="button" (click)="change()">
        Change cookie settings
      </button>
    </main>
  `,
})
export class CookiesPage {
  private readonly consent = inject(CookieConsentService);
  private readonly seo = inject(SeoService);

  constructor() {
    // Legal utility: reachable from every page, deliberately kept out of search.
    this.seo.applyNoIndex(
      'Cookie Settings | InspectMesh',
      'Manage optional analytics cookies for InspectMesh.',
    );
  }

  change(): void {
    this.consent.changeChoice();
  }
}
