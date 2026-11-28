import { isDateOnlyUtc } from '../src/app/features/guides/guide-publishing.ts';
import { guideRoutePath } from '../src/app/core/seo/public-routes.ts';
import type { GuideRegistryEntry } from '../src/content/guides/guides.registry.ts';

type SitemapGuide = Pick<
  GuideRegistryEntry,
  'slug' | 'enabled' | 'publishDate' | 'updatedDate'
>;

export function buildSitemap(
  siteUrl: string,
  paths: readonly string[],
  editorialDates: Readonly<Record<string, string>>,
  guides: readonly SitemapGuide[],
): string {
  const dates = new Map(Object.entries(editorialDates));
  for (const guide of guides) {
    if (guide.enabled) {
      dates.set(
        guideRoutePath(guide.slug),
        guide.updatedDate ?? guide.publishDate,
      );
    }
  }

  // The generated public route list controls publication, including future guides.
  const entries = paths.map((path) => {
    const route = path.startsWith('/') ? path : `/${path}`;
    const lastModified = dates.get(route);
    if (
      !lastModified ||
      !Number.isFinite(Date.parse(`${lastModified}T00:00:00.000Z`)) ||
      !isDateOnlyUtc(lastModified)
    ) {
      throw new Error(
        `Sitemap route "${route}" requires a real YYYY-MM-DD last-modified date in editorial-dates.mts or the guide registry.`,
      );
    }
    return `  <url><loc>${siteUrl}${route}</loc><lastmod>${lastModified}</lastmod></url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

/**
 * Temporary sitemap of retired URLs that now 301 to their current pages. It
 * is submitted manually in Search Console so Google recrawls the old URLs and
 * transfers them to their redirect targets. It is deliberately not advertised
 * in robots.txt, whose sitemaps must list only canonical 200 pages. lastmod is
 * the date each redirect went live, not build time.
 */
export function buildLegacySitemap(
  siteUrl: string,
  routes: readonly { readonly path: string; readonly redirectedOn?: string }[],
  defaultRedirectDate: string,
): string {
  const entries = routes.map((route) => {
    const date = route.redirectedOn ?? defaultRedirectDate;
    if (!isDateOnlyUtc(date)) {
      throw new Error(
        `Legacy sitemap route "${route.path}" requires a YYYY-MM-DD redirect date.`,
      );
    }
    return `  <url><loc>${siteUrl}${route.path}</loc><lastmod>${date}</lastmod></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}
