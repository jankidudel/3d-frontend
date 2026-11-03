import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonicalPublicRoutePaths } from '../src/app/core/seo/public-routes.ts';
import { guideRoutePaths } from '../src/app/features/guides/generated/guide-route-data.generated.ts';
import { guideRegistry } from '../src/content/guides/guides.registry.ts';
import { editorialDates } from './editorial-dates.mts';
import { buildSitemap } from './sitemap.mts';

const siteUrl = 'https://www.inspectmesh.com';

afterEach(() => {
  vi.useRealTimers();
});

describe('sitemap editorial dates', () => {
  it('gives every current public route a valid lastmod', () => {
    const paths = [...canonicalPublicRoutePaths, ...guideRoutePaths];
    const sitemap = buildSitemap(siteUrl, paths, editorialDates, guideRegistry);
    expect([
      ...sitemap.matchAll(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g),
    ]).toHaveLength(paths.length);
    expect(sitemap).toContain(
      '<loc>https://www.inspectmesh.com/tools/stl-viewer</loc><lastmod>2026-11-02</lastmod>',
    );
    expect(sitemap).toContain(
      '<loc>https://www.inspectmesh.com/materials/pla</loc><lastmod>2026-11-03</lastmod>',
    );
    expect(sitemap).toContain(
      '<loc>https://www.inspectmesh.com/</loc><lastmod>2026-10-29</lastmod>',
    );
  });

  it('retains dates across later rebuilds instead of using the clock', () => {
    vi.useFakeTimers();
    const paths = [...canonicalPublicRoutePaths, ...guideRoutePaths];
    vi.setSystemTime(new Date('2026-10-06T12:00:00Z'));
    const first = buildSitemap(siteUrl, paths, editorialDates, guideRegistry);
    vi.setSystemTime(new Date('2027-05-01T12:00:00Z'));
    expect(buildSitemap(siteUrl, paths, editorialDates, guideRegistry)).toBe(
      first,
    );
  });

  it('uses a guide revision before its publication date and respects the public route list', () => {
    const sitemap = buildSitemap(
      siteUrl,
      ['guides/published', '/guides/revised'],
      {},
      [
        { slug: 'published', enabled: true, publishDate: '2026-09-05' },
        {
          slug: 'revised',
          enabled: true,
          publishDate: '2026-09-05',
          updatedDate: '2026-10-04',
        },
        { slug: 'disabled', enabled: false, publishDate: '2026-09-05' },
        { slug: 'future', enabled: true, publishDate: '2099-01-01' },
      ],
    );
    expect(sitemap).toContain(
      '/guides/published</loc><lastmod>2026-09-05</lastmod>',
    );
    expect(sitemap).toContain(
      '/guides/revised</loc><lastmod>2026-10-04</lastmod>',
    );
    expect(sitemap).not.toContain('/disabled');
    expect(sitemap).not.toContain('/future');
  });

  it.each([undefined, '', '2026-02-30', '2026-13-01', '06/10/2026'])(
    'rejects a new page with a missing or invalid date (%s)',
    (date) => {
      const dates: Readonly<Record<string, string>> =
        date === undefined ? {} : { '/new-tool': date };
      expect(() => buildSitemap(siteUrl, ['new-tool'], dates, [])).toThrow(
        '/new-tool',
      );
    },
  );
});
