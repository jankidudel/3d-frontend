import { GuideRouteUrl } from '../../core/seo/guide-routes';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/seo/seo.service';
import { guideRoutePath, PublicRouteUrl } from '../../core/seo/public-routes';
import {
  guideDiscoveryTasks,
  guideIndexCategories,
  guideIndexGroups,
} from './generated/guides.generated';
import { filterGuideGroups } from './guide-search';

@Component({
  selector: 'app-guides-page',
  imports: [RouterLink],
  templateUrl: './guides-page.html',
  styleUrl: './guides-page.scss',
})
export class GuidesPage {
  readonly discoveryTasks = guideDiscoveryTasks;
  readonly guideRouteUrl = GuideRouteUrl;
  protected readonly guidePath = guideRoutePath;
  protected readonly categories = guideIndexCategories;
  protected readonly tags = guideIndexGroups;
  protected readonly totalGuides = guideIndexGroups.reduce(
    (count, group) => count + group.guides.length,
    0,
  );
  protected readonly query = signal('');
  protected readonly category = signal('');
  protected readonly selectedTags = signal<readonly string[]>([]);
  protected readonly filtersExpanded = signal(false);
  protected readonly expandedGuides = signal<ReadonlySet<string>>(new Set());
  protected readonly guideGroups = computed(() =>
    filterGuideGroups(
      guideIndexGroups,
      this.query(),
      this.category(),
      this.selectedTags(),
    ),
  );
  protected readonly hasFilters = computed(
    () => !!(this.query() || this.category() || this.selectedTags().length),
  );
  protected readonly resultCount = computed(() =>
    this.guideGroups().reduce((count, group) => count + group.guides.length, 0),
  );
  protected readonly routeUrl = PublicRouteUrl;
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: '3D Printing File Guides and Troubleshooting | InspectMesh',
      description:
        'Find practical guides for STL and 3MF errors, units, dimensions, mesh changes and print preparation, with links to the relevant tools.',
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

  protected toggleTag(tag: string): void {
    this.selectedTags.update((selected) =>
      selected.includes(tag)
        ? selected.filter((item) => item !== tag)
        : [...selected, tag],
    );
  }

  protected toggleDescription(slug: string): void {
    this.expandedGuides.update((current) => {
      const expanded = new Set(current);
      if (expanded.has(slug)) {
        expanded.delete(slug);
      } else {
        expanded.add(slug);
      }
      return expanded;
    });
  }

  protected clearFilters(): void {
    this.query.set('');
    this.category.set('');
    this.clearTopicFilters();
  }

  protected clearTopicFilters(): void {
    if (this.selectedTags().length === 0) {
      return;
    }
    this.selectedTags.set([]);
  }
}
