import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import {
  loadGeneratedPages,
  type GeneratedPage,
} from './check-internal-links.mts';

export const productionOrigin = 'https://www.inspectmesh.com';

/** Inspect delivered HTML, without executing the application or uploading files. */
export function inspectPublicHtml(page: GeneratedPage) {
  const window = new JSDOM(page.html, { url: productionOrigin + page.route })
    .window;
  const document = window.document;
  const main = document.querySelector('main');
  const text = main?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .filter((link) => !link.hasAttribute('download'))
    .flatMap((link) => {
      const url = new URL(
        link.getAttribute('href')!,
        productionOrigin + page.route,
      );
      return url.origin === productionOrigin ? [url.pathname] : [];
    });
  const canonicals = [
    ...document.querySelectorAll('link[rel="canonical"]'),
  ].map((element) => element.getAttribute('href'));
  const robots = [
    ...document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]'),
  ].map((element) => element.getAttribute('content') ?? '');
  const result = {
    title: document.title.trim(),
    description:
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute('content') ?? null,
    headings: [...document.querySelectorAll('h1')].map((element) =>
      element.textContent?.trim(),
    ),
    canonical: canonicals.length === 1 ? canonicals[0] : null,
    canonicalCount: canonicals.length,
    robots,
    mainTextCharacters: text.length,
    mainContentSha256: createHash('sha256').update(text).digest('hex'),
    sectionHeadings: [...(main?.querySelectorAll('h2') ?? [])].map((element) =>
      element.textContent?.trim(),
    ),
    exampleAssets: [
      ...new Set(
        [...document.querySelectorAll('[href], [src]')]
          .map(
            (element) =>
              element.getAttribute('href') ?? element.getAttribute('src') ?? '',
          )
          .filter((url) => url.startsWith('/examples/')),
      ),
    ],
    contextualLinks: [
      ...new Set(
        [...(main?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [])]
          .map(
            (link) =>
              new URL(
                link.getAttribute('href')!,
                productionOrigin + page.route,
              ),
          )
          .filter(
            (url) =>
              url.origin === productionOrigin &&
              !url.pathname.startsWith('/examples/'),
          )
          .map((url) => url.pathname),
      ),
    ],
    links: [...new Set(links)],
  };
  window.close();
  return result;
}

export function shortestPaths(links: ReadonlyMap<string, readonly string[]>) {
  const depths = new Map<string, number>([['/', 0]]);
  const queue = ['/'];
  for (const route of queue) {
    for (const target of links.get(route) ?? []) {
      if (links.has(target) && !depths.has(target)) {
        depths.set(target, depths.get(route)! + 1);
        queue.push(target);
      }
    }
  }
  return depths;
}

export function htmlFailures(
  route: string,
  observation: ReturnType<typeof inspectPublicHtml>,
) {
  const failures: string[] = [];
  if (
    observation.canonicalCount !== 1 ||
    observation.canonical !== productionOrigin + route
  ) {
    failures.push(
      'Initial HTML must contain exactly one matching self-canonical.',
    );
  }
  if (observation.headings.length !== 1 || !observation.headings[0]) {
    failures.push('Initial HTML must contain one nonempty H1.');
  }
  if (
    !observation.title ||
    !observation.description ||
    !observation.mainTextCharacters
  ) {
    failures.push(
      'Initial HTML is missing title, description or main content.',
    );
  }
  if (observation.robots.some((value) => /(?:noindex|\bnone\b)/i.test(value))) {
    failures.push(
      'An intended indexable route has a blocking robots directive.',
    );
  }
  return failures;
}

async function audit() {
  const root = resolve(import.meta.dirname, '..');
  const ledgerPath = resolve(root, 'docs/seo-url-ledger.json');
  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  const pages = await loadGeneratedPages(
    resolve(root, 'dist/3d-frontend/browser'),
  );
  const observations = new Map(
    pages.map((page) => [page.route, inspectPublicHtml(page)]),
  );
  const sitemap = await readFile(resolve(root, 'public/sitemap.xml'), 'utf8');
  const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1]).pathname,
  );
  const failures: string[] = [];
  if (new Set(routes).size !== routes.length) {
    failures.push('Duplicate sitemap URLs.');
  }
  type LedgerRow = {
    path: string;
    local?: { mainContentSha256: string; observedAt: string };
    contentHistory?: { mainContentSha256: string; observedAt: string }[];
  };
  const indexedRows = new Map<string, LedgerRow>(
    ledger.pages.map((row: LedgerRow) => [row.path, row]),
  );
  const links = new Map(
    [...observations].map(([route, page]) => [route, page.links]),
  );
  const depths = shortestPaths(links);
  for (const route of routes) {
    const row = indexedRows.get(route);
    const observation = observations.get(route);
    if (!row || !observation) {
      failures.push(`${route}: missing ledger row or prerendered HTML.`);
      continue;
    }
    failures.push(
      ...htmlFailures(route, observation).map(
        (failure) => `${route}: ${failure}`,
      ),
    );
    const incomingLinks = [...observations]
      .filter(
        ([source, value]) => source !== route && value.links.includes(route),
      )
      .map(([source]) => source);
    const contextualInlinks = [...observations]
      .filter(
        ([source, value]) =>
          source !== route && value.contextualLinks.includes(route),
      )
      .map(([source]) => source);
    if (
      !depths.has(route) ||
      (route !== '/' && contextualInlinks.length === 0)
    ) {
      failures.push(
        `${route}: unreachable or lacks a link from another page's main content.`,
      );
    }
    if (
      row.local &&
      row.local.mainContentSha256 !== observation.mainContentSha256
    ) {
      row.contentHistory ??= [];
      if (
        !row.contentHistory.some(
          (previous) =>
            previous.mainContentSha256 === row.local!.mainContentSha256,
        )
      ) {
        row.contentHistory.push({
          mainContentSha256: row.local.mainContentSha256,
          observedAt: row.local.observedAt,
        });
      }
    }
    const {
      links: _links,
      contextualLinks: _contextualLinks,
      ...facts
    } = observation;
    Object.assign(row, {
      url: productionOrigin + route,
      sitemapMember: true,
      local: {
        ...facts,
        incomingLinkCount: incomingLinks.length,
        contextualInlinkCount: contextualInlinks.length,
        contextualInlinkExamples: contextualInlinks.slice(0, 5),
        internalLinkCount: observation.links.length,
        clickDepth: depths.get(route) ?? null,
        observedAt: new Date().toISOString(),
        evidenceScope:
          'Production prerender output; not a live HTTP response or Google rendering.',
      },
    });
  }
  for (const row of ledger.pages) {
    if (!routes.includes(row.path)) {
      failures.push(
        `${row.path}: ledger row is absent from the sitemap; review its disposition explicitly.`,
      );
    }
  }
  ledger.coverage = {
    sitemapUrls: routes.length,
    ledgerRows: ledger.pages.length,
    localFailures: failures,
  };
  if (process.argv.includes('--write')) {
    await writeFile(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
  }
  for (const failure of failures) {
    console.error(failure);
  }
  console.log(
    `SEO ledger: ${routes.length} sitemap URLs, ${ledger.pages.length} rows, ${failures.length} local failures. Live and Google evidence remain independent.`,
  );
  if (failures.length) {
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await audit();
}
