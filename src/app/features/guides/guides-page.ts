import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { Component, computed, inject, signal } from '@angular/core';
import { SeoService } from '../../core/seo/seo.service';
import { PublicRouteUrl } from '../../core/seo/public-routes';
import { guideIndexGroups } from './generated/guides.generated';
import { filterGuideGroups } from './guide-search';

@Component({
  selector: 'app-guides-page',
  templateUrl: './guides-page.html',
  styleUrl: './guides-page.scss',
})
export class GuidesPage {
  readonly guideRouteUrl = GuideRouteUrl;
  protected readonly query = signal('');
  protected readonly guideGroups = computed(() =>
    filterGuideGroups(guideIndexGroups, this.query()),
  );
  protected readonly hasSearchQuery = computed(
    () => this.query().trim() !== '',
  );
  protected readonly resultCount = computed(() =>
    this.guideGroups().reduce((count, group) => count + group.guides.length, 0),
  );
  protected readonly routeUrl = PublicRouteUrl;
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: '3D Printing File Guides | InspectMesh',
      description:
        'Practical guides for checking, repairing and preparing STL files for 3D printing.',
      path: PublicRouteUrl.Guides,
    });
  }

  protected pillarHeading(slug: string): string {
    return (
      guideIndexGroups
        .flatMap((group) => group.guides)
        .find((guide) => guide.slug === slug)?.heading ??
      slug.replaceAll('-', ' ')
    );
  }
  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected clearQuery(): void {
    this.query.set('');
  }
}
