import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SEO_CONFIG } from './seo-config';
import { Breadcrumb, breadcrumbStructuredData } from './breadcrumbs';
import {
  SHARE_IMAGE,
  SITE_NAME,
  TWITTER_CARD,
  publisherNode,
  siteIdentityNodes,
} from './site-identity';
import { webApplicationNode } from './web-applications';

const HOME_PATH = '/';
const SOCIAL_PROPERTIES = [
  'og:title',
  'og:description',
  'og:type',
  'og:url',
  'og:site_name',
  'og:image',
  'og:image:width',
  'og:image:height',
  'og:image:type',
  'og:image:alt',
] as const;
const TWITTER_NAMES = ['twitter:card', 'twitter:image:alt'] as const;

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
    this.pageStructuredData = this.pageGraph(page, canonicalUrl);
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

  /**
   * Adds the site identity (home page only) and WebApplication node (tool
   * pages only) to the page's own structured data. Nothing is added to
   * non-canonical deployments.
   */
  private pageGraph(
    page: PageSeo,
    canonicalUrl: string | null,
  ): Record<string, unknown> | undefined {
    if (!canonicalUrl) {
      return page.structuredData;
    }
    const origin = new URL(canonicalUrl).origin;
    const path = normalizedPath(page.path);
    const own = page.structuredData
      ? withArticleIdentity(page.structuredData, canonicalUrl, origin)
      : undefined;
    const extra = [
      ...(path === HOME_PATH ? siteIdentityNodes(origin) : []),
      webApplicationNode(path, canonicalUrl, page.description),
    ].filter((node): node is Record<string, unknown> => node !== undefined);
    if (!extra.length) {
      return own;
    }
    if (!own) {
      return { '@context': 'https://schema.org', '@graph': extra };
    }
    const graph = own['@graph'];
    if (Array.isArray(graph)) {
      return { ...own, '@graph': [...graph, ...extra] };
    }
    const node = Object.fromEntries(
      Object.entries(own).filter(([key]) => key !== '@context'),
    );
    return { '@context': 'https://schema.org', '@graph': [node, ...extra] };
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
      return `${siteUrl.origin}${normalizedPath(path)}`;
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
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ name: 'twitter:card', content: TWITTER_CARD });
    if (canonicalUrl) {
      const origin = new URL(canonicalUrl).origin;
      this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
      this.meta.updateTag({
        property: 'og:image',
        content: `${origin}${SHARE_IMAGE.path}`,
      });
      this.meta.updateTag({
        property: 'og:image:width',
        content: String(SHARE_IMAGE.width),
      });
      this.meta.updateTag({
        property: 'og:image:height',
        content: String(SHARE_IMAGE.height),
      });
      this.meta.updateTag({
        property: 'og:image:type',
        content: SHARE_IMAGE.type,
      });
      this.meta.updateTag({
        property: 'og:image:alt',
        content: SHARE_IMAGE.alt,
      });
      this.meta.updateTag({
        name: 'twitter:image:alt',
        content: SHARE_IMAGE.alt,
      });
      return;
    }
    for (const property of [
      'og:url',
      'og:image',
      'og:image:width',
      'og:image:height',
      'og:image:type',
      'og:image:alt',
    ]) {
      this.meta.removeTag(`property='${property}'`);
    }
    this.meta.removeTag("name='twitter:image:alt'");
  }

  private removeOpenGraph(): void {
    for (const property of SOCIAL_PROPERTIES) {
      this.meta.removeTag(`property='${property}'`);
    }
    for (const name of TWITTER_NAMES) {
      this.meta.removeTag(`name='${name}'`);
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

function normalizedPath(path: string): string {
  const trimmed = path.replace(/^\/+/, '');
  return trimmed ? `/${trimmed}` : HOME_PATH;
}

const ARTICLE_TYPE = 'Article';

/** Adds the canonical URL and publisher to Article nodes. */
function withArticleIdentity(
  data: Record<string, unknown>,
  canonicalUrl: string,
  origin: string,
): Record<string, unknown> {
  const enrich = (node: unknown): unknown => {
    if (
      !node ||
      typeof node !== 'object' ||
      (node as Record<string, unknown>)['@type'] !== ARTICLE_TYPE
    ) {
      return node;
    }
    return {
      ...node,
      url: canonicalUrl,
      mainEntityOfPage: canonicalUrl,
      publisher: publisherNode(origin),
    };
  };
  const graph = data['@graph'];
  if (Array.isArray(graph)) {
    return { ...data, '@graph': graph.map(enrich) };
  }
  return enrich(data) as Record<string, unknown>;
}
