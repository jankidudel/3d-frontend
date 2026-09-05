import {
  Component,
  DestroyRef,
  Injectable,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Breadcrumb, breadcrumbsForPath } from '../../seo/breadcrumbs';
import { SeoService } from '../../seo/seo.service';

@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  templateUrl: './breadcrumbs.html',
  styleUrl: './breadcrumbs.scss',
})
export class BreadcrumbsComponent implements OnDestroy {
  readonly breadcrumbs = inject(BreadcrumbState).breadcrumbs;
  private readonly router = inject(Router);
  private readonly state = inject(BreadcrumbState);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
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
    this.state.set(breadcrumbsForPath(path));
  }
}

@Injectable({ providedIn: 'root' })
export class BreadcrumbState {
  readonly breadcrumbs = signal<readonly Breadcrumb[]>([]);
  private readonly seo = inject(SeoService);

  set(breadcrumbs: readonly Breadcrumb[]): void {
    this.breadcrumbs.set(breadcrumbs);
    this.seo.setBreadcrumbs(breadcrumbs);
  }
}
