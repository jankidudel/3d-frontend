import { JSDOM } from 'jsdom';
import { isDateOnlyUtc } from '../src/app/features/guides/guide-publishing.ts';
import type { GeneratedPage } from './check-internal-links.mts';
import { inspectPublicHtml, shortestPaths } from './seo-audit.mts';
import type { RouterDiscovery } from './router-source.mts';
import {
  productionOrigin,
  RouteDisposition,
  type RouteSearchPolicy,
} from './route-search-policy.mts';

export const SitemapKind = { Urls: 'urlset', Index: 'sitemapindex' } as const;
export interface SitemapEntry {
  readonly loc: string;
  readonly lastmod: string | null;
}
export function parseSitemapXml(xml: string) {
  const window = new JSDOM(xml, { contentType: 'application/xml' }).window;
  try {
    const doc = window.document;
    const root = doc.documentElement;
    if (
      root.namespaceURI !== 'http://www.sitemaps.org/schemas/sitemap/0.9' ||
      (root.localName !== SitemapKind.Urls &&
        root.localName !== SitemapKind.Index)
    ) {
      throw new Error(
        'Expected a sitemap urlset or sitemapindex in the sitemap namespace.',
      );
    }
    const itemName = root.localName === SitemapKind.Urls ? 'url' : 'sitemap';
    const entries: SitemapEntry[] = [...root.children].map((element) => {
      const locs = [...element.children].filter(
        (node) => node.localName === 'loc',
      );
      const dates = [...element.children].filter(
        (node) => node.localName === 'lastmod',
      );
      if (
        element.localName !== itemName ||
        locs.length !== 1 ||
        dates.length > 1 ||
        !locs[0].textContent?.trim()
      ) {
        throw new Error(
          'Malformed sitemap entry: expected one loc and at most one lastmod.',
        );
      }
      return {
        loc: locs[0].textContent!.trim(),
        lastmod: dates[0]?.textContent?.trim() ?? null,
      };
    });
    return { kind: root.localName, entries };
  } finally {
    window.close();
  }
}

export function compareSitemap(
  entries: readonly SitemapEntry[],
  policies: readonly RouteSearchPolicy[],
): string[] {
  const failures: string[] = [];
  const counts = new Map<string, number>();
  const intended = new Map(
    policies
      .filter((p) => p.disposition === RouteDisposition.Indexable)
      .map((p) => [p.canonical, p]),
  );
  for (const entry of entries) {
    counts.set(entry.loc, (counts.get(entry.loc) ?? 0) + 1);
    let url: URL;
    try {
      url = new URL(entry.loc);
    } catch {
      failures.push(`Invalid sitemap URL: ${entry.loc}`);
      continue;
    }
    if (
      url.origin !== productionOrigin ||
      url.search ||
      url.hash ||
      url.href !== entry.loc
    ) {
      failures.push(`Noncanonical sitemap URL: ${entry.loc}`);
    }
    const policy = intended.get(entry.loc);
    if (!policy) {
      failures.push(`Unexpected sitemap entry: ${entry.loc}`);
    }
    if (entry.lastmod !== null && !isDateOnlyUtc(entry.lastmod)) {
      failures.push(`Unsupported lastmod for ${entry.loc}: ${entry.lastmod}`);
    }
    if (policy && entry.lastmod !== policy.lastmod) {
      failures.push(
        `Sitemap lastmod differs from ${policy.lastmodSource} for ${policy.path}: expected ${String(policy.lastmod)}, received ${String(entry.lastmod)}`,
      );
    }
  }
  for (const [loc, count] of counts) {
    if (count !== 1) {
      failures.push(`Duplicate sitemap entry (${count}): ${loc}`);
    }
  }
  for (const [loc, policy] of intended) {
    if (!counts.has(loc!)) {
      failures.push(`Missing sitemap entry: ${policy.path} (${loc})`);
    }
  }
  return failures;
}

/** Strip only the established trailing-slash alias; keep path case and reserved encodings. */
export function pagePath(url: URL): string {
  return url.pathname === '/' ? '/' : url.pathname.replace(/\/$/, '');
}
export function pageLinks(page: GeneratedPage) {
  const window = new JSDOM(page.html, { url: productionOrigin + page.route })
    .window;
  try {
    return [...window.document.querySelectorAll('a[href], area[href]')].flatMap(
      (element) => {
        if (element.hasAttribute('download')) {
          return [];
        }
        try {
          const url = new URL(
            element.getAttribute('href')!,
            productionOrigin + page.route,
          );
          if (url.origin !== productionOrigin) {
            return [];
          }
          return [
            {
              url: url.href,
              path: pagePath(url),
              query: url.search || null,
              fragment: url.hash || null,
              contextual:
                !!element.closest('main') &&
                !element.closest('nav, header, footer'),
            },
          ];
        } catch {
          return [];
        }
      },
    );
  } finally {
    window.close();
  }
}
const difference = (left: ReadonlySet<string>, right: ReadonlySet<string>) =>
  [...left].filter((path) => !right.has(path)).sort();
export function classificationFailures(
  router: RouterDiscovery,
  policies: readonly RouteSearchPolicy[],
) {
  const registered = new Set(router.routes.map((r) => r.path));
  const classified = new Set(policies.map((p) => p.path));
  const errors = [
    ...difference(registered, classified).map(
      (path) => `Unclassified router path: ${path}`,
    ),
    ...difference(classified, registered).map(
      (path) => `Policy has no registered route: ${path}`,
    ),
  ];
  for (const [label, paths] of [
    ['router', router.routes.map((r) => r.path)],
    ['policy', policies.map((p) => p.path)],
  ] as const) {
    const seen = new Set<string>();
    for (const path of paths) {
      if (seen.has(path)) {
        errors.push(`Duplicate ${label} path: ${path}`);
      }
      seen.add(path);
    }
  }
  return errors;
}

export function auditRouteCoverage(
  router: RouterDiscovery,
  policies: readonly RouteSearchPolicy[],
  pages: readonly GeneratedPage[],
  entries: readonly SitemapEntry[],
) {
  const R = new Set(router.routes.map((r) => r.path));
  const G = new Set(pages.map((p) => p.route));
  const I = new Set(
    policies
      .filter((p) => p.disposition === RouteDisposition.Indexable)
      .map((p) => p.path),
  );
  const S = new Set(
    entries
      .filter((e) => {
        try {
          const url = new URL(e.loc);
          return (
            url.origin === productionOrigin &&
            !url.search &&
            !url.hash &&
            I.has(url.pathname)
          );
        } catch {
          return false;
        }
      })
      .map((e) => new URL(e.loc).pathname),
  );
  const observations = new Map(
    pages.map((p) => [p.route, inspectPublicHtml(p)]),
  );
  const linked = new Map(pages.map((p) => [p.route, pageLinks(p)]));
  const graph = new Map(
    [...linked].map(([path, links]) => [path, links.map((l) => l.path)]),
  );
  const L = new Set([...linked.values()].flat().map((l) => l.path));
  const depth = shortestPaths(graph);
  const diffs = {
    'I-S': difference(I, S),
    'S-I': entries
      .filter(
        (e) =>
          !policies.some(
            (p) =>
              p.disposition === RouteDisposition.Indexable &&
              p.canonical === e.loc,
          ),
      )
      .map((e) => e.loc),
    'R-G': difference(R, G),
    'L-R': difference(L, R),
    'R-L': difference(R, L),
    'G-R': difference(G, R),
  };
  const failures = [
    ...classificationFailures(router, policies),
    ...compareSitemap(entries, policies),
  ];
  for (const key of ['R-G', 'L-R', 'G-R'] as const) {
    failures.push(...diffs[key].map((path) => `${key}: ${path}`));
  }
  const rows = policies.map((policy) => {
    const observation = observations.get(policy.path);
    const incoming = [...linked]
      .filter(
        ([source, links]) =>
          source !== policy.path && links.some((l) => l.path === policy.path),
      )
      .map(([source]) => source);
    const contextual = [...linked]
      .filter(
        ([source, links]) =>
          source !== policy.path &&
          links.some((l) => l.contextual && l.path === policy.path),
      )
      .map(([source]) => source);
    const errors: string[] = [];
    if (observation) {
      if (
        observation.canonical !== policy.canonical ||
        observation.canonicalCount !== (policy.canonical ? 1 : 0)
      ) {
        errors.push('Canonical does not match the explicit route policy.');
      }
      const noindex = observation.robots.some((r) =>
        /(?:noindex|\bnone\b)/i.test(r),
      );
      if (noindex !== policy.noindex) {
        errors.push(
          'Robots directives do not match the explicit route policy.',
        );
      }
      if (
        !observation.title ||
        !observation.description ||
        observation.headings.length !== 1 ||
        !observation.headings[0] ||
        observation.mainTextCharacters < 40
      ) {
        errors.push(
          'Missing page-specific initial title, description, H1 or main content.',
        );
      }
      if (I.has(policy.path)) {
        for (const fallback of ['/', '/404']) {
          const shell = observations.get(fallback);
          if (
            fallback !== policy.path &&
            shell &&
            (observation.mainContentSha256 === shell.mainContentSha256 ||
              observation.headings[0] === shell.headings[0])
          ) {
            errors.push(
              `Initial HTML is the ${fallback} fallback instead of this page.`,
            );
          }
        }
        if (
          !depth.has(policy.path) ||
          (policy.path !== '/' && incoming.length === 0)
        ) {
          errors.push(
            'Indexable route is orphaned or unreachable from the homepage.',
          );
        }
      }
    }
    failures.push(...errors.map((error) => `${policy.path}: ${error}`));
    const {
      links: _links,
      contextualLinks: _contextual,
      ...metadata
    } = observation ?? {};
    return {
      ...policy,
      discoverySources: router.routes.filter((r) => r.path === policy.path),
      output: pages.find((p) => p.route === policy.path)?.filePath ?? null,
      observed: observation ? metadata : null,
      sitemapCount: entries.filter((e) => e.loc === policy.canonical).length,
      incomingCount: incoming.length,
      contextualIncomingCount: contextual.length,
      incomingExamples: incoming.slice(0, 5),
      depth: depth.get(policy.path) ?? null,
      diagnosis: errors.length
        ? errors
        : [
            I.has(policy.path)
              ? 'Canonical route, built document, sitemap and incoming links agree.'
              : policy.reason,
          ],
      limitation:
        'Local generated HTML only. HTTP transport, hydration, Google indexing and release state are independent.',
    };
  });
  return {
    counts: { R: R.size, G: G.size, L: L.size, S: entries.length, I: I.size },
    differences: diffs,
    patterns: router.patterns,
    queryStateLinks: [...linked].flatMap(([source, links]) =>
      links.filter((l) => l.query).map((l) => ({ source, ...l })),
    ),
    exclusions: rows.filter(
      (r) => r.disposition !== RouteDisposition.Indexable,
    ),
    rows,
    failures,
  };
}
