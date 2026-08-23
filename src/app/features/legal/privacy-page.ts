import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { SITE_CONFIG } from '../../core/site/site-config';

@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink],
  template: `
    <main class="page legal-page">
      <p class="eyebrow">Your privacy</p>
      <h1>Privacy</h1>
      <h2>Uploaded files</h2>
      <p>
        Uploaded files are processed only to provide the requested analysis and
        are not used for advertising or marketing.
      </p>
      <h2>Analytics cookies</h2>
      <p>
        If you choose analytics cookies, we use Google Analytics to understand
        how visitors use the site and improve our tools.
      </p>
      <p>
        Learn more or change your choice on the
        <a routerLink="/cookies">cookies page</a>.
      </p>
      @if (privacyContactEmail) {
        <p>
          For privacy questions, contact us at
          <a [href]="'mailto:' + privacyContactEmail">{{
            privacyContactEmail
          }}</a
          >.
        </p>
      }
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
export class PrivacyPage {
  protected readonly privacyContactEmail =
    inject(SITE_CONFIG).privacyContactEmail;
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: 'Privacy - 3D Quality Tools',
      description:
        'Learn how 3D Quality Tools handles uploaded STL files and optional analytics cookies.',
      path: '/privacy',
    });
  }
}
