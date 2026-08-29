import { NgOptimizedImage } from '@angular/common';
import { Component, ElementRef, inject, viewChild } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { AnalyticsService } from './core/analytics/analytics.service';
import { CookieConsentBannerComponent } from './core/analytics/cookie-consent-banner/cookie-consent-banner';
import { CookieConsentService } from './core/analytics/cookie-consent.service';
import {
  MenuLink,
  MenuLinkVariant,
} from './core/components/menu-link/menu-link';
import { PublicRoutePath } from './core/seo/public-routes';

@Component({
  selector: 'app-root',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NgOptimizedImage,
    CookieConsentBannerComponent,
    MenuLink,
  ],
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:keydown.escape)': 'closeMenus()',
  },
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly consent = inject(CookieConsentService);
  readonly routePath = PublicRoutePath;
  readonly menuLinkVariant = MenuLinkVariant;
  readonly toolsDisclosure =
    viewChild<ElementRef<HTMLElement>>('toolsDisclosure');
  private readonly router = inject(Router);
  protected mobileNavOpen = false;
  protected toolsMenuOpen = false;

  constructor() {
    inject(AnalyticsService);
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe(() => this.closeMenus());
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  protected toggleToolsMenu(): void {
    this.toolsMenuOpen = !this.toolsMenuOpen;
  }

  protected openToolsMenu(): void {
    this.toolsMenuOpen = true;
  }

  protected onDocumentPointerDown(event: PointerEvent): void {
    const disclosure = this.toolsDisclosure()?.nativeElement;
    if (!disclosure || !(event.target instanceof Node)) {
      return;
    }
    if (!disclosure.contains(event.target)) {
      this.closeMenus();
    }
  }

  protected closeMenus(): void {
    this.mobileNavOpen = false;
    this.toolsMenuOpen = false;
  }
}
