import { NgOptimizedImage } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
} from '@angular/core';
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
  @ViewChild('toolsTrigger')
  private readonly toolsTrigger?: ElementRef<HTMLButtonElement>;

  readonly consent = inject(CookieConsentService);
  readonly routePath = PublicRoutePath;
  private readonly analytics = inject(AnalyticsService);
  private readonly router = inject(Router);
  protected mobileNavOpen = false;
  protected toolsOpen = false;

  constructor() {
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
    if (!this.mobileNavOpen) {
      this.toolsOpen = false;
    }
  }

  protected toggleTools(): void {
    this.toolsOpen = !this.toolsOpen;
  }

  protected closeMenus(): void {
    this.mobileNavOpen = false;
    this.toolsOpen = false;
  }

  @HostListener('document:click', ['$event'])
  protected closeOnOutsideClick(event: MouseEvent): void {
    const target = event.target;
    if (
      target instanceof Node &&
      !document.querySelector('.site-header')?.contains(target)
    ) {
      this.closeMenus();
    }
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    if (!this.toolsOpen && !this.mobileNavOpen) {
      return;
    }

    this.closeMenus();
    this.toolsTrigger?.nativeElement.focus();
  }
}
