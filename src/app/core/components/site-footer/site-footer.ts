import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CookieConsentService } from '../../analytics/cookie-consent.service';
import { PublicRoutePath } from '../../seo/public-routes';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooterComponent {
  readonly consent = inject(CookieConsentService);
  readonly routePath = PublicRoutePath;
}
