import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SEO_CONFIG } from './seo-config';
import { Breadcrumb, breadcrumbStructuredData } from './breadcrumbs';

export interface PageSeo {
  readonly title: string;
  readonly description: string;
  readonly path: string;
  readonly openGraphType?: 'article' | 'website';
  readonly structuredData?: Record<string, unknown>;
}

@Service()
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly config = inject(SEO_CONFIG);
  private pageStructuredData: Record<string, unknown> | undefined;
  private breadcrumbs: readonly Breadcrumb[] = [];

  apply(page: PageSeo): void {
    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });

    const canonicalUrl = this.canonicalUrl(page.path);
    this.meta.updateTag({
      name: 'robots',
      content: canonicalUrl ? 'index, follow' : 'noindex, nofollow',
    });
    this.updateCanonical(canonicalUrl);
    this.updateOpenGraph(page, canonicalUrl);
    this.pageStructuredData = page.structuredData;
    this.updateStructuredData();
  }

  applyNoIndex(title: string, description: string): void {
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    this.updateCanonical(null);
    this.removeOpenGraph();
    this.pageStructuredData = undefined;
    this.updateStructuredData();
  }

  setBreadcrumbs(breadcrumbs: readonly Breadcrumb[]): void {
    this.breadcrumbs = breadcrumbs;
    this.updateStructuredData();
  }

  private canonicalUrl(path: string): string | null {
    if (!this.config.indexingEnabled || !this.config.siteUrl) {
      return null;
    }

    try {
      const siteUrl = new URL(this.config.siteUrl);
      if (siteUrl.protocol !== 'https:') {
        return null;
      }
      return `${siteUrl.origin}${path === '/' ? '/' : `/${path.replace(/^\/+/, '')}`}`;
    } catch {
      return null;
    }
  }

  private updateCanonical(canonicalUrl: string | null): void {
    const selector = 'link[rel="canonical"]';
    const existing =
      this.document.head.querySelector<HTMLLinkElement>(selector);
    if (!canonicalUrl) {
      existing?.remove();
      return;
    }

    const canonical = existing ?? this.document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = canonicalUrl;
    if (!existing) {
      this.document.head.appendChild(canonical);
    }
  }

  private updateOpenGraph(page: PageSeo, canonicalUrl: string | null): void {
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({
      property: 'og:description',
      content: page.description,
    });
    this.meta.updateTag({
      property: 'og:type',
      content: page.openGraphType ?? 'website',
    });
    if (canonicalUrl) {
      this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
      return;
    }
    this.meta.removeTag("property='og:url'");
  }

  private removeOpenGraph(): void {
    for (const property of [
      'og:title',
      'og:description',
      'og:type',
      'og:url',
    ]) {
      this.meta.removeTag(`property='${property}'`);
    }
  }

  private updateStructuredData(): void {
    const data = this.structuredData();
    const selector = 'script[data-seo-structured-data]';
    const existing =
      this.document.head.querySelector<HTMLScriptElement>(selector);
    if (!data) {
      existing?.remove();
      return;
    }

    const script = existing ?? this.document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo-structured-data', 'true');
    script.textContent = JSON.stringify(data);
    if (!existing) {
      this.document.head.appendChild(script);
    }
  }

  private structuredData(): Record<string, unknown> | undefined {
    if (this.breadcrumbs.length === 0) {
      return this.pageStructuredData;
    }

    const breadcrumb = breadcrumbStructuredData(this.breadcrumbs);
    if (!this.pageStructuredData) {
      return breadcrumb;
    }

    const graph = this.pageStructuredData['@graph'];
    if (Array.isArray(graph)) {
      return { ...this.pageStructuredData, '@graph': [...graph, breadcrumb] };
    }

    return {
      '@context': 'https://schema.org',
      '@graph': [this.pageStructuredData, breadcrumb],
    };
  }
}
