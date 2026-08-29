import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './core/analytics/analytics.service';
import { CookieConsentBannerComponent } from './core/analytics/cookie-consent-banner/cookie-consent-banner';
import { SiteFooterComponent } from './core/components/site-footer/site-footer';
import { SiteHeaderComponent } from './core/components/site-header/site-header';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CookieConsentBannerComponent,
    SiteFooterComponent,
    SiteHeaderComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    inject(AnalyticsService);
  }
}
