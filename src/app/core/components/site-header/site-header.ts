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
import { PublicRoutePath } from '../../seo/public-routes';

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
  readonly routePath = PublicRoutePath;
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
    this.toolsMenuOpen = false;
  }

  protected toggleToolsMenu(): void {
    this.cancelToolsMenuClose();
    this.toolsMenuOpen = !this.toolsMenuOpen;
  }

  protected openToolsMenu(): void {
    const defaultView = this.document.defaultView;
    if (!defaultView?.matchMedia(MOBILE_NAVIGATION_MEDIA_QUERY).matches) {
      this.cancelToolsMenuClose();
      this.toolsMenuOpen = true;
    }
  }

  protected scheduleToolsMenuClose(): void {
    const defaultView = this.document.defaultView;
    if (
      !defaultView ||
      defaultView.matchMedia(MOBILE_NAVIGATION_MEDIA_QUERY).matches
    ) {
      return;
    }
    this.cancelToolsMenuClose();
    this.toolsMenuCloseTimeout = defaultView.setTimeout(() => {
      this.toolsMenuOpen = false;
      this.toolsMenuCloseTimeout = undefined;
      // Timers created from the injected document are not guaranteed to cause
      // a render in zoneless mode, so request one for the delayed close.
      this.changeDetectorRef.markForCheck();
    }, TOOLS_MENU_CLOSE_DELAY_MS);
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
    this.toolsMenuOpen = false;
  }

  private cancelToolsMenuClose(): void {
    if (this.toolsMenuCloseTimeout === undefined) {
      return;
    }
    this.document.defaultView?.clearTimeout(this.toolsMenuCloseTimeout);
    this.toolsMenuCloseTimeout = undefined;
  }

  private isToolsRoute(url: string): boolean {
    return (
      url === `/${PublicRoutePath.AllTools}` ||
      url.startsWith('/stl-') ||
      url.startsWith('/3mf-')
    );
  }
}
