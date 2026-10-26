import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { relative, resolve, sep } from 'node:path';
import { JSDOM } from 'jsdom';

const DEFAULT_OUTPUT_DIRECTORY = 'dist/3d-frontend/browser';
const INTERNAL_ORIGIN = 'https://internal.inspectmesh.invalid';

export interface GeneratedPage {
  readonly filePath: string;
  readonly route: string;
  readonly html: string;
}

export interface ValidationFailure {
  readonly source: string;
  readonly originalUrl: string;
  readonly resolvedTarget: string;
  readonly reason: string;
}

export async function loadGeneratedPages(
  outputDirectory: string,
): Promise<GeneratedPage[]> {
  const pageFiles = (await findHtmlFiles(outputDirectory)).filter(
    (filePath) => !filePath.endsWith(sep + 'index.csr.html'),
  );
  return Promise.all(
    pageFiles.map(async (filePath) => ({
      filePath,
      route: routeForFile(outputDirectory, filePath),
      html: await readFile(filePath, 'utf8'),
    })),
  );
}

export function validateGeneratedPages(
  pages: readonly GeneratedPage[],
): ValidationFailure[] {
  const failures: ValidationFailure[] = [];
  const routes = new Map(pages.map((page) => [page.route, page]));
  const siteOrigin = canonicalOrigin(pages);
  const canonicalPages = new Map<string, GeneratedPage>();

  for (const page of pages) {
    const document = new JSDOM(page.html).window.document;
    const canonicals = Array.from(
      document.querySelectorAll('link[rel="canonical"]'),
    );
    if (isIndexable(document) && canonicals.length !== 1) {
      failures.push({
        source: page.filePath,
        originalUrl: 'canonical',
        resolvedTarget: page.route,
        reason:
          canonicals.length === 0
            ? 'canonical URL is missing'
            : 'more than one canonical URL is present',
      });
    } else if (canonicals.length === 1) {
      validateCanonical(
        page,
        canonicals[0].getAttribute('href') ?? '',
        siteOrigin,
        routes,
        canonicalPages,
        failures,
      );
    }

    for (const element of document.querySelectorAll('a[href], area[href]')) {
      if (element.hasAttribute('download')) {
        continue;
      }
      const href = element.getAttribute('href')?.trim() ?? '';
      const failure = validateLink(page, href, siteOrigin, routes);
      if (failure) {
        failures.push(failure);
      }
    }
  }
  return failures;
}

function canonicalOrigin(pages: readonly GeneratedPage[]): string | null {
  for (const page of pages) {
    const href = new JSDOM(page.html).window.document
      .querySelector('link[rel="canonical"]')
      ?.getAttribute('href');
    if (!href) {
      continue;
    }
    try {
      return new URL(href).origin;
    } catch {
      continue;
    }
  }
  return null;
}

function isIndexable(document: Document): boolean {
  return !document
    .querySelector('meta[name="robots"]')
    ?.getAttribute('content')
    ?.toLowerCase()
    .includes('noindex');
}

function validateCanonical(
  page: GeneratedPage,
  href: string,
  siteOrigin: string | null,
  routes: ReadonlyMap<string, GeneratedPage>,
  canonicalPages: Map<string, GeneratedPage>,
  failures: ValidationFailure[],
): void {
  let canonical: URL;
  try {
    canonical = new URL(href);
  } catch {
    failures.push(failure(page, href, href, 'canonical URL is invalid'));
    return;
  }

  const route = normalizeRoute(canonical.pathname);
  if (
    canonical.protocol !== 'https:' ||
    canonical.search ||
    canonical.hash ||
    (siteOrigin !== null && canonical.origin !== siteOrigin)
  ) {
    failures.push(
      failure(page, href, canonical.href, 'canonical URL is inconsistent'),
    );
  }
  if (!routes.has(route)) {
    failures.push(
      failure(
        page,
        href,
        route,
        'canonical URL points to a generated page that is missing',
      ),
    );
  }
  if (route !== page.route) {
    failures.push(
      failure(
        page,
        href,
        route,
        'canonical URL does not match its generated page',
      ),
    );
  }
  const existing = canonicalPages.get(canonical.href);
  if (existing) {
    failures.push(
      failure(
        page,
        href,
        canonical.href,
        'duplicate canonical URL also used by ' + existing.filePath,
      ),
    );
  } else {
    canonicalPages.set(canonical.href, page);
  }
}

function validateLink(
  page: GeneratedPage,
  href: string,
  siteOrigin: string | null,
  routes: ReadonlyMap<string, GeneratedPage>,
): ValidationFailure | null {
  if (!href || isIgnoredScheme(href)) {
    return null;
  }
  let target: URL;
  try {
    target = new URL(href, pageUrl(page.route));
  } catch {
    return failure(page, href, href, 'URL is invalid');
  }
  if (isDevelopmentHost(target.hostname)) {
    return failure(
      page,
      href,
      target.href,
      'internal link points at a development or localhost domain',
    );
  }
  if (target.origin !== INTERNAL_ORIGIN && target.origin !== siteOrigin) {
    return null;
  }

  const route = normalizeRoute(target.pathname);
  const targetPage = routes.get(route);
  if (!targetPage) {
    return failure(page, href, route, 'generated page not found');
  }
  if (target.hash && !hasAnchor(targetPage.html, target.hash.slice(1))) {
    return failure(page, href, route + target.hash, 'anchor not found');
  }
  return null;
}

function failure(
  page: GeneratedPage,
  originalUrl: string,
  resolvedTarget: string,
  reason: string,
): ValidationFailure {
  return {
    source: page.filePath,
    originalUrl,
    resolvedTarget,
    reason,
  };
}

function isIgnoredScheme(href: string): boolean {
  return /^(?:mailto:|tel:|javascript:|data:)/i.test(href);
}

function isDevelopmentHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.cloudfront.net')
  );
}

function hasAnchor(html: string, fragment: string): boolean {
  const document = new JSDOM(html).window.document;
  let anchor: string;
  try {
    anchor = decodeURIComponent(fragment);
  } catch {
    return false;
  }
  return (
    document.getElementById(anchor) !== null ||
    Array.from(document.querySelectorAll('a[name]')).some(
      (element) => element.getAttribute('name') === anchor,
    )
  );
}

function pageUrl(route: string): string {
  return INTERNAL_ORIGIN + (route === '/' ? '/' : route + '/');
}

function normalizeRoute(pathname: string): string {
  const decoded = pathname;
  return decoded === '/' ? '/' : '/' + decoded.replace(/^\/+|\/+$/g, '');
}

export function routeForFile(
  outputDirectory: string,
  filePath: string,
): string {
  const outputRelativePath = relative(outputDirectory, filePath)
    .split(sep)
    .join('/');
  if (outputRelativePath === 'index.html') {
    return '/';
  }
  if (outputRelativePath.endsWith('/index.html')) {
    return normalizeRoute(outputRelativePath.slice(0, -'/index.html'.length));
  }
  return normalizeRoute(outputRelativePath.replace(/\.html$/, ''));
}

async function findHtmlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        return findHtmlFiles(entryPath);
      }
      return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
    }),
  );
  return files.flat();
}

async function main(): Promise<void> {
  const outputDirectory = resolve(
    process.cwd(),
    process.argv[2] ?? DEFAULT_OUTPUT_DIRECTORY,
  );
  const failures = validateGeneratedPages(
    await loadGeneratedPages(outputDirectory),
  );
  if (failures.length === 0) {
    console.log('Internal link validation passed.');
    return;
  }

  console.error(
    'Internal link validation failed (' + failures.length + ' links):\\n',
  );
  for (const item of failures) {
    console.error(
      '- ' +
        item.source +
        '\\n  ' +
        item.originalUrl +
        ' → ' +
        item.resolvedTarget +
        ' (' +
        item.reason +
        ')\\n',
    );
  }
  process.exitCode = 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  void main();
}
