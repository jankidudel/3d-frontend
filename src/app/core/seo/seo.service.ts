import { DOCUMENT } from '@angular/common';
import { inject, Service } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SEO_CONFIG } from './seo-config';

export interface PageSeo {
  readonly title: string;
  readonly description: string;
  readonly path: string;
}

@Service()
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly config = inject(SEO_CONFIG);

  apply(page: PageSeo): void {
    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });

    const canonicalUrl = this.canonicalUrl(page.path);
    this.meta.updateTag({
      name: 'robots',
      content: canonicalUrl ? 'index, follow' : 'noindex, nofollow',
    });
    this.updateCanonical(canonicalUrl);
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
}
