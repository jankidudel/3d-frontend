import { format, resolveConfig } from 'prettier';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import {
  DeliveryFailure,
  inspectDelivery,
  type DeliveryHop,
} from './audit-production.mts';
import { boundedBytes, maxDocumentBytes } from './http-documents.mts';
import {
  deliveryVariants,
  headerCanonicals,
  verifyCriticalAssets,
  verifyVariants,
} from './delivery-diagnostics.mts';
import {
  compareSitemap,
  parseSitemapXml,
  SitemapKind,
  type SitemapEntry,
} from './route-coverage.mts';
import {
  productionOrigin,
  routeSearchPolicy,
  RouteDisposition,
  type RouteSearchPolicy,
} from './route-search-policy.mts';

const maxSitemaps = 20;
const maxPages = 240;
const maxSitemapEntries = 1000;
const concurrency = 3;
const maxLinksPerPage = 500;
const missingPath = '/seo-route-audit-definitely-missing-20261025';
const redirectStatuses = new Set([301, 302, 303, 307, 308]);

function isPublicPagePath(path: string): boolean {
  return (
    !/\.[^/]+$/.test(path) &&
    !/^\/(?:api|jobs?|results?|reports?|uploads?|account|private)(?:\/|$)/i.test(
      path,
    )
  );
}
async function resource(url: string, request: typeof fetch) {
  const hops: { url: string; status: number; location: string | null }[] = [];
  const visited = new Set<string>();
  for (let index = 0; index < 8; index++) {
    if (visited.has(url) || new URL(url).origin !== productionOrigin) {
      throw new Error(
        `Sitemap/robots redirect loop or external destination: ${url}`,
      );
    }
    visited.add(url);
    const response = await request(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    const location = response.headers.get('location');
    hops.push({ url, status: response.status, location });
    if (redirectStatuses.has(response.status) && location) {
      await response.body?.cancel();
      url = new URL(location, url).href;
      continue;
    }
    const bytes = await boundedBytes(response);
    return {
      requestedUrl: hops[0].url,
      finalUrl: url,
      status: response.status,
      hops,
      contentType: response.headers.get('content-type'),
      bytes,
    };
  }
  throw new Error('Resource redirect chain exceeded eight responses.');
}

export async function collectSitemaps(
  urls: readonly string[],
  request: typeof fetch,
) {
  const pending = [...urls];
  const visited = new Set<string>();
  const entries: SitemapEntry[] = [];
  const documents: {
    url: string;
    finalUrl: string | null;
    status: number | null;
    hops: unknown[];
    contentType: string | null;
    error: string | null;
  }[] = [];
  const failures: string[] = [];
  let truncated = false;
  while (pending.length) {
    const url = pending.shift()!;
    if (visited.has(url)) {
      continue;
    }
    if (visited.size >= maxSitemaps) {
      truncated = true;
      failures.push('Sitemap traversal truncated at the document limit.');
      break;
    }
    visited.add(url);
    const previousDocuments = documents.length;
    try {
      const result = await resource(url, request);
      documents.push({
        url,
        finalUrl: result.finalUrl,
        status: result.status,
        hops: result.hops,
        contentType: result.contentType,
        error: null,
      });
      if (result.status !== 200) {
        failures.push(`Sitemap did not return HTTP 200: ${url}`);
        continue;
      }
      const zipped = result.bytes[0] === 0x1f && result.bytes[1] === 0x8b;
      const bytes = zipped
        ? gunzipSync(result.bytes, { maxOutputLength: maxDocumentBytes })
        : result.bytes;
      const doc = parseSitemapXml(new TextDecoder().decode(bytes));
      if (doc.kind === SitemapKind.Index) {
        for (const entry of doc.entries) {
          const child = new URL(entry.loc);
          if (
            child.origin !== productionOrigin ||
            child.search ||
            child.hash ||
            /^\/(?:api|jobs?|results?|reports?|uploads?|account|private)(?:\/|$)/i.test(
              child.pathname,
            )
          ) {
            failures.push(`Unsupported sitemap index target: ${entry.loc}`);
          } else {
            pending.push(child.href);
          }
        }
      } else {
        entries.push(...doc.entries);
        if (entries.length > maxSitemapEntries) {
          entries.length = maxSitemapEntries;
          truncated = true;
          failures.push('Sitemap traversal truncated at the entry limit.');
          break;
        }
      }
    } catch (error) {
      if (documents.length > previousDocuments) {
        documents[documents.length - 1].error = String(error);
      } else {
        documents.push({
          url,
          finalUrl: null,
          status: null,
          hops: [],
          contentType: null,
          error: String(error),
        });
      }
      failures.push(`${url}: ${String(error)}`);
    }
  }
  return { entries, documents, failures, truncated };
}

/** Longest applicable Allow/Disallow rule, retaining path encoding and query. */
export function robotsAccess(
  text: string,
  path: string,
  agent: string,
): boolean {
  const groups: {
    agents: string[];
    rules: { allow: boolean; path: string }[];
  }[] = [];
  let hasRules = false;
  let group = {
    agents: [] as string[],
    rules: [] as { allow: boolean; path: string }[],
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const match = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!match) {
      continue;
    }
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === 'user-agent') {
      if (hasRules) {
        groups.push(group);
        group = { agents: [], rules: [] };
        hasRules = false;
      }
      group.agents.push(value.toLowerCase());
    } else if (key === 'allow' || key === 'disallow') {
      hasRules = true;
      if (value) {
        group.rules.push({ allow: key === 'allow', path: value });
      }
    }
  }
  groups.push(group);
  const specificity = (agents: string[]) =>
    Math.max(
      -1,
      ...agents.map((a) =>
        a === '*' ? 0 : agent.toLowerCase().startsWith(a) ? a.length : -1,
      ),
    );
  const best = Math.max(-1, ...groups.map((g) => specificity(g.agents)));
  let score = -1;
  let allow = true;
  for (const current of groups.filter(
    (g) => best >= 0 && specificity(g.agents) === best,
  )) {
    for (const rule of current.rules) {
      const pattern = rule.path
        .split('*')
        .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')
        .replace(/\\\$$/, '$');
      if (new RegExp('^' + pattern).test(path)) {
        const length = rule.path.replaceAll('*', '').replace(/\$$/, '').length;
        if (length > score || (length === score && rule.allow)) {
          score = length;
          allow = rule.allow;
        }
      }
    }
  }
  return allow;
}

export function blocksGoogleIndexing(header: string | null): boolean {
  let agent: string | null = null;
  for (const value of (header ?? '').split(',')) {
    const match = value.trim().match(/^(?:(\w[\w-]*):\s*)?(.*)$/)!;
    if (match[1]) {
      agent = match[1].toLowerCase();
    }
    if (
      (!agent || agent === 'googlebot') &&
      /^(?:noindex|none)(?:\s|$)/i.test(match[2])
    ) {
      return true;
    }
  }
  return false;
}

export async function verifyProduction(
  request: typeof fetch = fetch,
  policies: readonly RouteSearchPolicy[] = routeSearchPolicy,
) {
  const failures: string[] = [];
  const skippedLinks: { source: string; url: string; reason: string }[] = [];
  const responses = new Map<
    string,
    Awaited<ReturnType<typeof inspectDelivery>>
  >();
  const unavailable: {
    requestedUrl: string;
    status: null;
    finalUrl: null;
    attempted: boolean;
    limitation: string;
    hops: readonly DeliveryHop[];
  }[] = [];
  const pending = [
    '/',
    '/tools',
    '/guides',
    '/stl-tools',
    '/3mf-tools',
    ...policies.map((p) => p.path),
    missingPath,
  ];
  const visited = new Set<string>();
  let first: Awaited<ReturnType<typeof inspectDelivery>>;
  try {
    first = await inspectDelivery(productionOrigin + '/', request);
  } catch (error) {
    const limitation = `Origin preflight unavailable from this audit environment: ${String(error)}. This does not establish a site outage.`;
    return {
      observedAt: new Date().toISOString(),
      complete: false,
      truncated: false,
      bounds: { maxPages, maxSitemaps, maxSitemapEntries, concurrency },
      robots: { status: null, finalUrl: null, limitation },
      sitemap: { status: null, finalUrl: null, limitation },
      responses: [],
      unavailable: [...new Set(pending)].map((path) => ({
        requestedUrl: productionOrigin + path,
        status: null,
        finalUrl: null,
        attempted: path === '/',
        limitation,
        hops:
          path === '/' && error instanceof DeliveryFailure ? error.hops : [],
      })),
      failures: [limitation],
      skippedLinks,
      variants: deliveryVariants.map((variant) => ({
        ...variant,
        status: null,
        finalUrl: null,
        attempted: false,
        limitation,
        hops: [],
      })),
      criticalAssets: { results: [], truncated: false, limitation },
    };
  }
  const robotsResult = await resource(
    productionOrigin + '/robots.txt',
    request,
  ).catch((error: unknown) => {
    failures.push(`robots.txt unavailable: ${String(error)}`);
    return null;
  });
  const robots =
    robotsResult?.status === 200
      ? new TextDecoder().decode(robotsResult.bytes)
      : null;
  if (robots === null) {
    failures.push('robots.txt access rules remain unverified.');
  }
  const advertised = robots
    ? [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gim)].map((m) => m[1])
    : [];
  const sitemap = await collectSitemaps(
    [productionOrigin + '/sitemap.xml', ...advertised],
    request,
  );
  failures.push(
    ...sitemap.failures,
    ...compareSitemap(sitemap.entries, policies),
  );
  for (const entry of sitemap.entries) {
    try {
      const url = new URL(entry.loc);
      if (
        url.origin === productionOrigin &&
        !url.search &&
        !url.hash &&
        isPublicPagePath(url.pathname)
      ) {
        pending.push(url.pathname);
      }
    } catch {
      // compareSitemap already records the exact malformed URL.
    }
  }
  let cursor = 0;
  async function check(path: string) {
    const url = productionOrigin + path;
    try {
      const response =
        path === '/' ? first : await inspectDelivery(url, request);
      responses.set(path, response);
      if (path === missingPath) {
        if (response.status !== 404) {
          failures.push(
            `Nonexistent route returned HTTP ${response.status}, expected 404.`,
          );
        }
        return;
      }
      const policy = policies.find((p) => p.path === path);
      if (!policy) {
        failures.push(
          `Production links/sitemap discovered an unclassified public path: ${path}`,
        );
      }
      if (
        response.status !== 200 ||
        response.finalUrl !== url ||
        !response.raw
      ) {
        failures.push(
          `${path}: canonical page did not return its own HTML with HTTP 200.`,
        );
      }
      if (policy && response.raw) {
        const httpCanonicals = headerCanonicals(
          response.link,
          response.finalUrl,
        );
        if (
          httpCanonicals.some((canonical) => canonical !== policy.canonical)
        ) {
          failures.push(`${path}: HTTP Link canonical disagrees with policy.`);
        }
        if (
          response.raw.canonical !== policy.canonical ||
          response.raw.canonicalCount !== (policy.canonical ? 1 : 0)
        ) {
          failures.push(`${path}: delivered canonical disagrees with policy.`);
        }
        const noindex = response.raw.robots.some((r) =>
          /(?:noindex|\bnone\b)/i.test(r),
        );
        if (
          (noindex || blocksGoogleIndexing(response.xRobotsTag)) !==
          policy.noindex
        ) {
          failures.push(
            `${path}: delivered indexability disagrees with policy.`,
          );
        }
        if (
          !response.raw.title ||
          !response.raw.description ||
          response.raw.headings.length !== 1 ||
          response.raw.mainTextCharacters < 40
        ) {
          failures.push(`${path}: page-specific initial HTML is incomplete.`);
        }
        if (policy.disposition === RouteDisposition.Indexable) {
          if (robots !== null && !robotsAccess(robots, path, 'Googlebot')) {
            failures.push(`${path}: robots.txt blocks Googlebot.`);
          }
          if (
            path !== '/' &&
            (response.raw.mainContentSha256 === first.raw?.mainContentSha256 ||
              response.raw.headings[0] === first.raw?.headings[0] ||
              response.raw.headings[0] === 'Page Not Found')
          ) {
            failures.push(
              `${path}: homepage/not-found fallback instead of the intended initial page.`,
            );
          }
        }
      }
      if (response.linkEvidence.length > maxLinksPerPage) {
        truncated = true;
        failures.push(
          `${path}: link discovery truncated at ${maxLinksPerPage} links.`,
        );
      }
      for (const link of response.linkEvidence.slice(0, maxLinksPerPage)) {
        if (link.query || !isPublicPagePath(link.path)) {
          skippedLinks.push({
            source: path,
            url: link.url,
            reason:
              'Query state, asset or private/transient endpoint: retained for diagnosis, not fetched.',
          });
        } else {
          pending.push(link.path);
        }
      }
    } catch (error) {
      unavailable.push({
        requestedUrl: url,
        status: null,
        finalUrl: null,
        attempted: true,
        limitation: String(error),
        hops: error instanceof DeliveryFailure ? error.hops : [],
      });
      failures.push(`${path}: GET unavailable: ${String(error)}`);
    }
  }
  let truncated = sitemap.truncated;
  while (cursor < pending.length) {
    const batch: string[] = [];
    while (cursor < pending.length && batch.length < concurrency) {
      const path = pending[cursor++];
      if (visited.has(path)) {
        continue;
      }
      if (visited.size >= maxPages) {
        truncated = true;
        break;
      }
      visited.add(path);
      batch.push(path);
    }
    await Promise.all(batch.map(check));
    if (truncated && visited.size >= maxPages) {
      failures.push('Public HTML crawl truncated at the page limit.');
      break;
    }
  }
  const notFound = responses.get('/404')?.raw;
  if (notFound) {
    for (const policy of policies.filter(
      (p) => p.disposition === RouteDisposition.Indexable,
    )) {
      const raw = responses.get(policy.path)?.raw;
      if (
        raw &&
        (raw.mainContentSha256 === notFound.mainContentSha256 ||
          raw.headings[0] === notFound.headings[0])
      ) {
        failures.push(
          `${policy.path}: delivered the not-found fallback instead of its own page.`,
        );
      }
    }
  }
  const identities = new Map<string, string>();
  for (const policy of policies.filter(
    (p) => p.disposition === RouteDisposition.Indexable,
  )) {
    const raw = responses.get(policy.path)?.raw;
    if (raw) {
      const previous = identities.get(raw.mainContentSha256);
      if (previous) {
        failures.push(
          `${policy.path}: identical initial main document to ${previous}; investigate wrong-page delivery or duplicate content.`,
        );
      } else {
        identities.set(raw.mainContentSha256, policy.path);
      }
    }
  }
  const variants = await verifyVariants(request);
  for (const variant of variants) {
    failures.push(
      ...variant.failures.map(
        (failure) => `${variant.requestedUrl}: ${failure}`,
      ),
    );
  }
  const criticalAssets = await verifyCriticalAssets(
    [...responses.values()].flatMap((response) => response.criticalAssets),
    request,
  );
  for (const asset of criticalAssets.results) {
    if (asset.failure) {
      failures.push(`${asset.url}: ${asset.failure}`);
    }
  }
  if (criticalAssets.truncated) {
    failures.push('Critical asset verification truncated at the asset limit.');
  }
  return {
    observedAt: new Date().toISOString(),
    complete:
      !truncated &&
      !unavailable.length &&
      !sitemap.failures.length &&
      robots !== null &&
      !criticalAssets.truncated &&
      variants.every((variant) => variant.status !== null) &&
      criticalAssets.results.every((asset) => asset.status !== null),
    truncated,
    bounds: { maxPages, maxSitemaps, maxSitemapEntries, concurrency },
    robots: robotsResult
      ? {
          status: robotsResult.status,
          finalUrl: robotsResult.finalUrl,
          hops: robotsResult.hops,
          contentType: robotsResult.contentType,
          verified: robots !== null,
        }
      : { status: null, finalUrl: null, verified: false },
    sitemap,
    responses: [...responses.values()].map((response) => ({
      ...response,
      robotsAccess:
        robots === null
          ? null
          : {
              generic: robotsAccess(
                robots,
                new URL(response.requestedUrl).pathname,
                '*',
              ),
              googlebot: robotsAccess(
                robots,
                new URL(response.requestedUrl).pathname,
                'Googlebot',
              ),
            },
    })),
    unavailable,
    failures,
    skippedLinks,
    variants,
    criticalAssets,
    limitation:
      'Read-only public initial HTTP documents. Browser hydration, production revision and Google indexing are not inferred.',
  };
}

export async function runProductionAudit() {
  const result = await verifyProduction();
  if (process.argv.includes('--write')) {
    const path = resolve(import.meta.dirname, '../docs/seo-url-ledger.json');
    const ledger = JSON.parse(await readFile(path, 'utf8'));
    ledger.productionRouteCoverage = result;
    for (const page of ledger.pages) {
      const response = result.responses.find(
        (candidate) => candidate.requestedUrl === page.url,
      );
      if (response) {
        const {
          renderedCanonical: _canonical,
          renderedRobots: _robots,
          ...initialResponse
        } = response;
        page.live = { ...page.live, ...initialResponse };
      }
    }
    ledger.additionalUrls ??= [];
    for (const variant of result.variants) {
      let row = ledger.additionalUrls.find(
        (candidate: { requestedUrl: string }) =>
          candidate.requestedUrl === variant.requestedUrl,
      );
      if (!row) {
        row = {
          requestedUrl: variant.requestedUrl,
          discovery:
            'Fixed public delivery diagnostic; not a known Google URL.',
        };
        ledger.additionalUrls.push(row);
      }
      row.latestAttempt = {
        observedAt: result.observedAt,
        attempted: 'attempted' in variant ? variant.attempted : true,
        status: variant.status,
        finalUrl: variant.finalUrl,
        hops: variant.hops,
        expectedStatus: variant.expectedStatus,
        expectedCanonical: variant.expectedCanonical,
        limitation: 'limitation' in variant ? variant.limitation : null,
        failures: 'failures' in variant ? variant.failures : [],
      };
      if (variant.status !== null) {
        Object.assign(row, {
          status: variant.status,
          finalUrl: variant.finalUrl,
          hops: variant.hops,
          observedAt: result.observedAt,
          limitation: null,
        });
      }
    }
    await writeFile(
      path,
      await format(JSON.stringify(ledger), {
        ...(await resolveConfig(path)),
        parser: 'json',
      }),
    );
  }
  console.log(JSON.stringify(result, null, 2));
  if (result.failures.length || !result.complete) {
    process.exitCode = 1;
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await runProductionAudit();
}
