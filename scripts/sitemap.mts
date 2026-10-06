import { isDateOnlyUtc } from '../src/app/features/guides/guide-publishing.ts';
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
      dates.set(`/${guide.slug}`, guide.updatedDate ?? guide.publishDate);
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
