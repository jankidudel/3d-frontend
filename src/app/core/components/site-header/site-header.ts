import { DOCUMENT, NgOptimizedImage } from '@angular/common';
import {
  Component,
  ChangeDetectorRef,
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
import {
  getPublicRouteForUrl,
  PageType,
  PublicRoutePathValue,
} from '../../seo/public-routes';

const MOBILE_NAVIGATION_MEDIA_QUERY = '(max-width: 48rem)';
const TOOLS_MENU_CLOSE_DELAY_MS = 1_000;

@Component({
  selector: 'app-site-header',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, MenuLink],
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(document:pointermove)': 'onDocumentPointerMove($event)',
    '(document:keydown.escape)': 'closeMenus()',
  },
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeaderComponent {
  private readonly document = inject(DOCUMENT);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  readonly routePath = PublicRoutePathValue;
  readonly menuLinkVariant = MenuLinkVariant;
  readonly toolsDisclosure =
    viewChild<ElementRef<HTMLElement>>('toolsDisclosure');
  protected mobileNavOpen = false;
  protected toolsMenuOpen = false;
  protected readonly toolsActive = signal(false);
  private toolsMenuCloseTimeout?: number;

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
    this.cancelToolsMenuClose();
    this.mobileNavOpen = !this.mobileNavOpen;
    this.setToolsMenuOpen(this.mobileNavOpen);
  }

  protected toggleToolsMenu(): void {
    this.cancelToolsMenuClose();
    this.setToolsMenuOpen(!this.toolsMenuOpen);
  }

  protected openToolsMenu(): void {
    if (!this.isMobileNavigation()) {
      this.cancelToolsMenuClose();
      this.setToolsMenuOpen(true);
    }
  }

  protected scheduleToolsMenuClose(): void {
    const defaultView = this.document.defaultView;
    if (!defaultView || this.isMobileNavigation()) {
      return;
    }
    this.cancelToolsMenuClose();
    this.toolsMenuCloseTimeout = defaultView.setTimeout(() => {
      this.setToolsMenuOpen(false);
      this.toolsMenuCloseTimeout = undefined;
      // Timers created from the injected document are not guaranteed to cause
      // a render in zoneless mode, so request one for the delayed close.
      this.changeDetectorRef.markForCheck();
    }, TOOLS_MENU_CLOSE_DELAY_MS);
  }

  protected onDocumentPointerDown(event: PointerEvent): void {
    if (this.isMobileNavigation()) {
      return;
    }
    const disclosure = this.toolsDisclosure()?.nativeElement;
    if (!disclosure || !(event.target instanceof Node)) {
      return;
    }
    if (!disclosure.contains(event.target)) {
      this.closeMenus();
    }
  }

  protected onDocumentPointerMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || !this.toolsMenuOpen) {
      return;
    }
    const disclosure = this.toolsDisclosure()?.nativeElement;
    if (!disclosure || !(event.target instanceof Node)) {
      return;
    }
    if (disclosure.contains(event.target)) {
      this.cancelToolsMenuClose();
    } else {
      this.scheduleToolsMenuClose();
    }
  }

  protected closeMenus(): void {
    this.cancelToolsMenuClose();
    this.mobileNavOpen = false;
    this.setToolsMenuOpen(false);
  }

  private setToolsMenuOpen(open: boolean): void {
    this.toolsMenuOpen = open;
  }

  private isMobileNavigation(): boolean {
    return Boolean(
      this.document.defaultView?.matchMedia?.(MOBILE_NAVIGATION_MEDIA_QUERY)
        .matches,
    );
  }

  protected cancelToolsMenuClose(): void {
    if (this.toolsMenuCloseTimeout === undefined) {
      return;
    }
    this.document.defaultView?.clearTimeout(this.toolsMenuCloseTimeout);
    this.toolsMenuCloseTimeout = undefined;
  }

  private isToolsRoute(url: string): boolean {
    return getPublicRouteForUrl(url)?.pageType === PageType.Tool;
  }
}
