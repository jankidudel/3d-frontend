import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import {
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs';
import { MenuLink, MenuLinkVariant } from '../menu-link/menu-link';
import { PublicRoutePath } from '../../seo/public-routes';

const MOBILE_NAVIGATION_MEDIA_QUERY = '(max-width: 48rem)';

@Component({
  selector: 'app-site-header',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, MenuLink],
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:keydown.escape)': 'closeMenus()',
  },
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeaderComponent {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  readonly routePath = PublicRoutePath;
  readonly menuLinkVariant = MenuLinkVariant;
  readonly toolsDisclosure =
    viewChild<ElementRef<HTMLElement>>('toolsDisclosure');
  protected mobileNavOpen = false;
  protected toolsMenuOpen = false;
  protected readonly toolsActive = signal(false);

  constructor() {
    this.toolsActive.set(this.isToolsRoute(this.router.url));
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => {
        this.toolsActive.set(this.isToolsRoute(event.urlAfterRedirects));
        this.closeMenus();
      });
  }

  protected toggleMobileNav(): void {
    this.mobileNavOpen = !this.mobileNavOpen;
    this.toolsMenuOpen = false;
  }

  protected toggleToolsMenu(): void {
    this.toolsMenuOpen = !this.toolsMenuOpen;
  }

  protected openToolsMenu(): void {
    const defaultView = this.document.defaultView;
    if (!defaultView?.matchMedia(MOBILE_NAVIGATION_MEDIA_QUERY).matches) {
      this.toolsMenuOpen = true;
    }
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

  private isToolsRoute(url: string): boolean {
    return (
      url === `/${PublicRoutePath.AllTools}` ||
      url.startsWith('/stl-') ||
      url.startsWith('/3mf-')
    );
  }
}
