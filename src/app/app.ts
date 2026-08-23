import { NgOptimizedImage } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AnalyticsService } from './core/analytics/analytics.service';
import { CookieConsentBannerComponent } from './core/analytics/cookie-consent-banner/cookie-consent-banner';
import { CookieConsentService } from './core/analytics/cookie-consent.service';
import { PublicRoutePath } from './core/seo/public-routes';

@Component({
  selector: 'app-root',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NgOptimizedImage,
    CookieConsentBannerComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly consent = inject(CookieConsentService);
  readonly routePath = PublicRoutePath;
  private readonly analytics = inject(AnalyticsService);
}
