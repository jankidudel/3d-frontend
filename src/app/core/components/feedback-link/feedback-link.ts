import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { PublicRouteUrl } from '../../seo/public-routes';

@Component({
  selector: 'app-feedback-link',
  template: `
    <p class="feedback-link">
      <a [href]="href">Something missing or incorrect? Send feedback</a>
    </p>
  `,
  styles: `
    .feedback-link {
      margin: 1.5rem 0 0;
      color: var(--muted);
      font-size: 0.95rem;
    }
  `,
})
export class FeedbackLinkComponent {
  readonly href: string;

  constructor() {
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    const currentPath = isBrowser
      ? inject(DOCUMENT).location.pathname || '/'
      : '/';
    this.href = `${PublicRouteUrl.Contact}?context=${encodeURIComponent(currentPath)}`;
  }
}
