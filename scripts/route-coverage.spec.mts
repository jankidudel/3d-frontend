import { boundedBytes, maxDocumentBytes } from './http-documents.mts';
import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { discoverRouter } from './router-source.mts';
import {
  auditRouteCoverage,
  classificationFailures,
  compareSitemap,
  pageLinks,
  parseSitemapXml,
} from './route-coverage.mts';
import {
  productionOrigin,
  routeSearchPolicy,
  RouteDisposition,
} from './route-search-policy.mts';
import { buildSitemap } from './sitemap.mts';
import { editorialDates } from './editorial-dates.mts';
import { guideRegistry } from '../src/content/guides/guides.registry.ts';
import {
  blocksGoogleIndexing,
  collectSitemaps,
  robotsAccess,
  verifyProduction,
} from './verify-production-routes.mts';
import { validateGeneratedPages } from './check-internal-links.mts';

const intended = routeSearchPolicy.filter(
  (p) => p.disposition === RouteDisposition.Indexable,
);
const xml = () =>
  buildSitemap(
    productionOrigin,
    intended.map((p) => p.path),
    editorialDates,
    guideRegistry,
  );
const entries = () => parseSitemapXml(xml()).entries;
const main = (path: string, links = '') =>
  `<title>${path} | InspectMesh</title><meta name="description" content="Page-specific description for ${path}"><meta name="robots" content="index,follow"><link rel="canonical" href="${productionOrigin}${path}"><main><h1>${path}</h1><p>Distinct useful inspection content for the ${path} workflow and its next action.</p>${links}</main>`;

describe('independent router coverage', () => {
  it('finds an unclassified tool added to the real router without touching the manifest', async () => {
    const file = resolve(import.meta.dirname, '../src/app/app.routes.ts');
    const source = await readFile(file, 'utf8');
    const changed = source.replace(
      'export const routes: Routes = [',
      `export const routes: Routes = [{path:'new-public-hub',loadComponent:()=>import('./new-hub').then(m=>m.Hub)},`,
    );
    const failures = classificationFailures(
      discoverRouter(changed, file),
      routeSearchPolicy,
    );
    expect(failures).toEqual(['Unclassified router path: /new-public-hub']);
  });
  it('resolves actual finite families, reused planner components and existing exclusions', () => {
    const router = discoverRouter();
    expect(classificationFailures(router, routeSearchPolicy)).toEqual([]);
    for (const path of [
      '/3mf-repair',
      '/3d-print-finish-time-calculator',
      '/privacy',
      '/3d-printers/review-draft',
      '/compare/bambu-lab-p1s-vs-p2s',
    ]) {
      expect(router.routes.some((r) => r.path === path)).toBe(true);
    }
    expect(router.patterns.map((p) => p.path)).toEqual([
      '/guides/:guideSlug',
      '/**',
    ]);
    expect(routeSearchPolicy.find((p) => p.path === '/privacy')).toMatchObject({
      disposition: RouteDisposition.Excluded,
      noindex: false,
      canonical: productionOrigin + '/privacy',
    });
  });
  it('publishes only the new guide and materials URLs, without old aliases', () => {
    const paths = discoverRouter().routes.map((route) => route.path);
    for (const entry of guideRegistry.filter(
      (guide) => guide.enabled && guide.publishDate <= '2026-10-28',
    )) {
      expect(paths).toContain(`/guides/${entry.slug}`);
      expect(paths).not.toContain(`/${entry.slug}`);
    }
    expect(paths).toContain('/materials');
    expect(paths).toContain('/materials/pla');
    expect(
      paths.some((path) => path.startsWith('/3d-printing-materials')),
    ).toBe(false);
    const sitemap = xml();
    expect(sitemap).toContain('/guides/how-to-fix-non-manifold-stl</loc>');
    expect(sitemap).not.toContain(
      `${productionOrigin}/how-to-fix-non-manifold-stl</loc>`,
    );
  });
  it('follows lazy child exports and rejects unresolved expressions instead of skipping them', () => {
    const source = `export const routes=[{path:'hub',loadChildren:()=>import('./child.routes').then(m=>m.childRoutes)}];`;
    const router = discoverRouter(
      source,
      '/tmp/routes.ts',
      () =>
        `export const childRoutes=[{path:'tool',loadComponent:()=>import('./tool').then(m=>m.Tool)}];`,
    );
    expect(router.routes.map((r) => r.path)).toEqual(['/hub/tool']);
    expect(() =>
      discoverRouter(`export const routes=unknownFactory();`),
    ).toThrow('Unresolved router expression');
    expect(() =>
      discoverRouter(`export const routes=[{path:':unknown',component:Tool}];`),
    ).toThrow('Unresolved dynamic router path');
  });
});

describe('exact XML sitemap membership', () => {
  it('detects a missing tool even though its similarly named guide is retained', () => {
    const kept = entries().filter(
      (p) => p.loc !== productionOrigin + '/3mf-repair',
    );
    expect(
      kept.some(
        (p) => p.loc === productionOrigin + '/guides/how-to-repair-a-3mf-file',
      ),
    ).toBe(true);
    expect(compareSitemap(kept, routeSearchPolicy)).toContain(
      `Missing sitemap entry: /3mf-repair (${productionOrigin}/3mf-repair)`,
    );
  });
  it('rejects duplicates, exclusions, wrong hosts, query states and invalid dates', () => {
    const original = entries();
    const changed = [
      ...original,
      original[0],
      { loc: productionOrigin + '/privacy', lastmod: null },
      { loc: 'https://inspectmesh.com/3mf-repair', lastmod: null },
      {
        loc: productionOrigin + '/3mf-repair?example=test',
        lastmod: '2026-02-30',
      },
    ];
    const failures = compareSitemap(changed, routeSearchPolicy).join('\n');
    expect(failures).toContain('Duplicate sitemap entry');
    expect(failures).toContain(
      'Unexpected sitemap entry: ' + productionOrigin + '/privacy',
    );
    expect(failures).toContain(
      'Noncanonical sitemap URL: https://inspectmesh.com/3mf-repair',
    );
    expect(failures).toContain('?example=test');
    expect(failures).toContain('Unsupported lastmod');
  });
  it('does not collapse path case, queries or encoded slashes into another route', () => {
    for (const path of [
      '/3MF-repair',
      '/3mf-repair?state=1',
      '/3mf%2Frepair',
      '/3mf-repair/',
    ]) {
      const changed = entries().map((p) =>
        p.loc === productionOrigin + '/3mf-repair'
          ? { ...p, loc: productionOrigin + path }
          : p,
      );
      expect(compareSitemap(changed, routeSearchPolicy).join('\n')).toContain(
        'Missing sitemap entry: /3mf-repair',
      );
    }
    expect(() => parseSitemapXml('<urlset><url>broken')).toThrow();
  });
});

describe('built route/link evidence', () => {
  it('rejects another tool document even when its canonical has been rewritten correctly', () => {
    const policies = routeSearchPolicy.filter((p) =>
      ['/', '/stl-viewer', '/3mf-viewer'].includes(p.path),
    );
    const pages = policies.map((p) => ({
      route: p.path,
      filePath: p.path + '/index.html',
      html:
        p.path === '/'
          ? main(
              '/',
              '<a href="/stl-viewer">STL</a><a href="/3mf-viewer">3MF</a>',
            )
          : main('/stl-viewer').replace(
              `href="${productionOrigin}/stl-viewer"`,
              `href="${productionOrigin}${p.path}"`,
            ),
    }));
    const report = auditRouteCoverage(
      {
        routes: policies.map((p) => ({
          path: p.path,
          source: 'fixture',
          renderer: 'Component',
        })),
        patterns: [],
      },
      policies,
      pages,
      entries().filter((entry) =>
        policies.some((p) => p.canonical === entry.loc),
      ),
    );
    expect(
      report.failures.some((failure) =>
        failure.includes('Identical initial main document'),
      ),
    ).toBe(true);
  });
  it('separates hub links, contextual links and query state without decoding reserved characters', () => {
    const links = pageLinks({
      route: '/',
      filePath: 'index.html',
      html: main(
        '/',
        `<nav><a href="/tools">Tools</a></nav><a href="/3mf-repair?example=test#plan">Repair</a><a href="/3mf%2Frepair">Encoded</a>`,
      ),
    });
    expect(links[0].contextual).toBe(false);
    expect(links[1]).toMatchObject({
      path: '/3mf-repair',
      query: '?example=test',
      fragment: '#plan',
      contextual: true,
    });
    expect(links[2].path).toBe('/3mf%2Frepair');
  });
  it('detects a home fallback even with a rewritten canonical, and reports missing/stale output', () => {
    const home = routeSearchPolicy.find((p) => p.path === '/')!;
    const tool = routeSearchPolicy.find((p) => p.path === '/3mf-repair')!;
    const pages = [
      {
        route: '/',
        filePath: 'index.html',
        html: main('/', '<a href="/3mf-repair">Repair</a>'),
      },
      {
        route: tool.path,
        filePath: '3mf-repair/index.html',
        html: main('/').replace(
          'href="' + productionOrigin + '/"',
          'href="' + tool.canonical + '"',
        ),
      },
      { route: '/stale', filePath: 'stale.html', html: main('/stale') },
    ];
    const report = auditRouteCoverage(
      {
        routes: [
          { path: '/', source: 'fixture', renderer: 'Home' },
          { path: tool.path, source: 'fixture', renderer: 'Repair' },
          { path: '/missing', source: 'fixture', renderer: 'Missing' },
        ],
        patterns: [],
      },
      [home, tool],
      pages,
      entries().filter((e) => [home.canonical, tool.canonical].includes(e.loc)),
    );
    expect(report.failures.join('\n')).toContain('fallback');
    expect(report.differences['R-G']).toEqual(['/missing']);
    expect(report.differences['G-R']).toEqual(['/stale']);
  });
  it('treats an ordinary hub navigation link as reachability without inventing a contextual article link', () => {
    const policies = routeSearchPolicy.filter((p) =>
      ['/', '/3mf-repair'].includes(p.path),
    );
    const pages = [
      {
        route: '/',
        filePath: 'index.html',
        html: '<nav><a href="/3mf-repair">Repair</a></nav>' + main('/'),
      },
      {
        route: '/3mf-repair',
        filePath: 'repair.html',
        html: main('/3mf-repair'),
      },
    ];
    const report = auditRouteCoverage(
      {
        routes: policies.map((p) => ({
          path: p.path,
          source: 'fixture',
          renderer: 'Component',
        })),
        patterns: [],
      },
      policies,
      pages,
      entries().filter((e) => policies.some((p) => p.canonical === e.loc)),
    );
    expect(report.failures).toEqual([]);
    expect(report.rows.find((p) => p.path === '/3mf-repair')).toMatchObject({
      incomingCount: 1,
      contextualIncomingCount: 0,
      depth: 1,
    });
  });
  it('checks same-page fragments and does not resolve an encoded slash as a real nested page', () => {
    const pages = [
      {
        route: '/',
        filePath: 'index.html',
        html: main(
          '/',
          '<a href="#absent">Bad fragment</a><a href="/one%2Ftwo">Encoded</a>',
        ),
      },
      {
        route: '/one/two',
        filePath: 'one/two/index.html',
        html: main('/one/two'),
      },
    ];
    const failures = validateGeneratedPages(pages);
    expect(failures.some((f) => f.reason === 'anchor not found')).toBe(true);
    expect(
      failures.some(
        (f) =>
          f.originalUrl === '/one%2Ftwo' &&
          f.reason === 'generated page not found',
      ),
    ).toBe(true);
  });
});

describe('bounded production evidence', () => {
  it('follows a sitemap index and compressed child with a visited set', async () => {
    let requests = 0;
    const request: typeof fetch = async (input) => {
      requests++;
      return String(input).endsWith('child.xml.gz')
        ? new Response(gzipSync(xml()), {
            headers: { 'content-type': 'application/gzip' },
          })
        : new Response(
            `<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${productionOrigin}/child.xml.gz</loc></sitemap><sitemap><loc>${productionOrigin}/sitemap.xml</loc></sitemap></sitemapindex>`,
            { headers: { 'content-type': 'application/xml' } },
          );
    };
    const result = await collectSitemaps(
      [productionOrigin + '/sitemap.xml'],
      request,
    );
    expect(result.failures).toEqual([]);
    expect(result.entries.length).toBe(intended.length);
    expect(requests).toBe(2);
  });
  it('preserves null observations when DNS/network access fails', async () => {
    const request: typeof fetch = async () => {
      throw new Error('DNS unavailable');
    };
    const result = await verifyProduction(request);
    expect(result.complete).toBe(false);
    expect(result.responses).toEqual([]);
    expect(
      result.unavailable.every((p) => p.status === null && p.finalUrl === null),
    ).toBe(true);
    expect(result.failures[0]).toContain('does not establish a site outage');
  });
  it('crawls a linked page absent from the sitemap, records response headers and verifies a true missing-route status', async () => {
    // Exercise crawl behaviour with representative routes. Full inventory
    // coverage is checked independently above and against every built page.
    const policies = routeSearchPolicy.filter((policy) =>
      [
        '/',
        '/tools',
        '/guides',
        '/stl-tools',
        '/3mf-tools',
        '/stl-viewer',
        '/3mf-viewer',
        '/3mf-repair',
      ].includes(policy.path),
    );
    const sitemap = buildSitemap(
      productionOrigin,
      policies.map((policy) => policy.path),
      editorialDates,
      guideRegistry,
    );
    const seen: string[] = [];
    const request: typeof fetch = async (input) => {
      const url = new URL(String(input));
      seen.push(url.pathname);
      if (url.pathname === '/robots.txt') {
        return new Response(
          'User-agent: *\nAllow: /\nSitemap: ' +
            productionOrigin +
            '/sitemap.xml',
        );
      }
      if (url.pathname === '/sitemap.xml') {
        return new Response(sitemap, {
          headers: { 'content-type': 'application/xml' },
        });
      }
      const policy = policies.find((p) => p.path === url.pathname);
      const missing = url.pathname.includes('definitely-missing');
      const bodyPath = ['/stl-viewer', '/3mf-viewer'].includes(url.pathname)
        ? '/shared-wrong-tool'
        : url.pathname;
      const html = main(
        bodyPath,
        url.pathname === '/'
          ? '<a href="/linked-only-public-tool">Linked tool</a><a href="/jobs/private-token">Private endpoint</a><a href="/3mf-repair?token=private">State</a>'
          : '',
      ).replace(
        `href="${productionOrigin}${bodyPath}"`,
        `href="${productionOrigin}${url.pathname}"`,
      );
      return new Response(
        policy?.noindex
          ? html
              .replace(/<link rel="canonical"[^>]*>/, '')
              .replace('index,follow', 'noindex,nofollow')
          : html,
        {
          status: missing ? 404 : 200,
          headers: {
            'content-type': 'text/html',
            'x-robots-tag': 'bingbot: noindex',
            ...(url.pathname === '/3mf-repair'
              ? { link: '<https://www.inspectmesh.com/wrong>; rel="canonical"' }
              : {}),
          },
        },
      );
    };
    const result = await verifyProduction(request, policies);
    expect(seen).toContain('/linked-only-public-tool');
    expect(seen).not.toContain('/stl-repair');
    expect(seen).not.toContain('/jobs/private-token');
    expect(
      result.responses.some(
        (p) =>
          p.requestedUrl.includes('definitely-missing') && p.status === 404,
      ),
    ).toBe(true);
    expect(result.failures).toContain(
      'Production links/sitemap discovered an unclassified public path: /linked-only-public-tool',
    );
    expect(result.failures).toContain(
      '/3mf-repair: HTTP Link canonical disagrees with policy.',
    );
    expect(
      result.failures.some((failure) =>
        failure.includes('identical initial main document'),
      ),
    ).toBe(true);
    expect(
      result.responses.find(
        (p) => p.requestedUrl === productionOrigin + '/3mf-repair',
      )?.xRobotsTag,
    ).toBe('bingbot: noindex');
  });
  it('bounds response bytes and reports truncated sitemap traversal', async () => {
    await expect(
      boundedBytes(new Response(new Uint8Array(maxDocumentBytes + 1))),
    ).rejects.toThrow('Document truncated');
    let calls = 0;
    const request: typeof fetch = async () => {
      calls++;
      return new Response(
        `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${productionOrigin}/child-${calls}.xml</loc></sitemap></sitemapindex>`,
      );
    };
    const result = await collectSitemaps(
      [productionOrigin + '/sitemap.xml'],
      request,
    );
    expect(calls).toBe(20);
    expect(result.truncated).toBe(true);
    expect(result.failures.join(' ')).toContain('truncated');
  });
  it('applies relevant robots agents and longest allow/disallow rules', () => {
    const robots =
      'User-agent: *\nAllow: /\nUser-agent: Googlebot\nDisallow: /tools\nAllow: /tools/allowed$';
    expect(robotsAccess(robots, '/tools', 'Googlebot')).toBe(false);
    expect(robotsAccess(robots, '/tools/allowed', 'Googlebot')).toBe(true);
    expect(robotsAccess(robots, '/tools', 'OtherBot')).toBe(true);
    expect(blocksGoogleIndexing('bingbot: noindex')).toBe(false);
    expect(blocksGoogleIndexing('googlebot: noindex, nofollow')).toBe(true);
    expect(blocksGoogleIndexing('noindex')).toBe(true);
  });
});
