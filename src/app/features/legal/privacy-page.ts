import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-page',
  imports: [RouterLink],
  template: `
    <main class="page legal-page">
      <p class="eyebrow">Your privacy</p>
      <h1>Privacy</h1>
      <p>
        This site uses optional Google Analytics 4 analytics only after you
        explicitly accept analytics cookies. Analytics helps us understand
        general tool usage and improve the site.
      </p>
      <p>
        We do not intentionally send file contents, filenames, job IDs, email
        addresses, or other personal or sensitive values to Google Analytics.
        Analytics remains disabled if you reject it or have not made a choice.
      </p>
      <p>
        Learn more or change your choice on the
        <a routerLink="/cookies">cookies page</a>.
      </p>
      <p>
        For privacy questions, contact us through
        <a
          href="https://github.com/jankidudel/3d-frontend/issues"
          rel="noreferrer"
          >GitHub Issues</a
        >.
      </p>
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
export class PrivacyPage {}
