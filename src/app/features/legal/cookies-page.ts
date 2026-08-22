import { Component, inject } from '@angular/core';
import { CookieConsentService } from '../../core/analytics/cookie-consent.service';
import { SeoService } from '../../core/seo/seo.service';

@Component({
  selector: 'app-cookies-page',
  template: `
    <main class="page legal-page">
      <p class="eyebrow">Your choices</p>
      <h1>Cookies</h1>
      <p>
        Analytics cookies are optional. If accepted, Google Analytics 4 helps us
        measure anonymous usage patterns such as page views and whether the STL
        checking flow succeeds or fails.
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
  styles: `
    .legal-page {
      max-width: 50rem;
    }
    .legal-page p:not(.eyebrow) {
      color: var(--muted);
    }
  `,
})
export class CookiesPage {
  private readonly consent = inject(CookieConsentService);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: 'Cookie Settings - 3D Quality Tools',
      description: 'Manage optional analytics cookies for 3D Quality Tools.',
      path: '/cookies',
    });
  }

  change(): void {
    this.consent.changeChoice();
  }
}
