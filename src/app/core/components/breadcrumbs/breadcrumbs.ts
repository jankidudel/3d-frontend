import {
  Component,
  DestroyRef,
  Injectable,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Breadcrumb, breadcrumbsForPath } from '../../seo/breadcrumbs';
import { SeoService } from '../../seo/seo.service';
import { PublicRouteUrl } from '../../seo/public-routes';

@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.scss',
})
export class BreadcrumbsComponent implements OnInit, OnDestroy {
  readonly breadcrumbs = inject(BreadcrumbState).breadcrumbs;
  private readonly router = inject(Router);
  private readonly state = inject(BreadcrumbState);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.setBreadcrumbs(this.router.url);
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.setBreadcrumbs(event.urlAfterRedirects));
  }

  protected isCurrent(index: number): boolean {
    return index === this.breadcrumbs().length - 1;
  }

  ngOnDestroy(): void {
    this.state.set([]);
  }

  private setBreadcrumbs(path: string): void {
    this.state.routeTrail(breadcrumbsForPath(path));
  }
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbState {
  readonly breadcrumbs = signal<readonly Breadcrumb[]>([]);
  private readonly seo = inject(SeoService);

  private pageTrail: readonly Breadcrumb[] | null = null;

  set(breadcrumbs: readonly Breadcrumb[]): void {
    this.breadcrumbs.set(breadcrumbs);
    this.seo.setBreadcrumbs(breadcrumbs);
  }

  /** Applies the URL-derived trail unless the current page supplied its own. */
  routeTrail(derived: readonly Breadcrumb[]): void {
    if (!derived.length && this.pageTrail) {
      this.set(this.pageTrail);
      return;
    }
    this.set(derived);
  }

  usePageTrail(trail: readonly Breadcrumb[]): void {
    this.pageTrail = [
      { label: HOME_LABEL, href: PublicRouteUrl.Home },
      ...trail,
    ];
    this.set(this.pageTrail);
  }

  clearPageTrail(): void {
    this.pageTrail = null;
  }
}

const HOME_LABEL = 'Home';

/**
 * For a page whose breadcrumb depends on its own record, such as a printer or
 * material. The layout's single breadcrumb renders this trail (Home is added),
 * and the BreadcrumbList structured data uses the same entries. Call it from
 * the page constructor.
 */
export function usePageBreadcrumbs(trail: readonly Breadcrumb[]): void {
  const state = inject(BreadcrumbState);
  state.usePageTrail(trail);
  inject(DestroyRef).onDestroy(() => state.clearPageTrail());
}
