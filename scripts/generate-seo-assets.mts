import { guideRegistry } from '../src/content/guides/guides.registry.ts';
import { editorialDates } from './editorial-dates.mts';
import { buildSitemap } from './sitemap.mts';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { routeSearchPolicy, RouteDisposition } from './route-search-policy.mts';
import { discoverRouter } from './router-source.mts';
import { classificationFailures } from './route-coverage.mts';

type BuildConfiguration = 'development' | 'production';
interface SiteConfig {
  readonly siteUrl: unknown;
  readonly indexingEnabled: unknown;
}

const coverageFailures = classificationFailures(
  discoverRouter(),
  routeSearchPolicy,
);
if (coverageFailures.length) {
  throw new Error(coverageFailures.join('\n'));
}
const configuration = process.argv[2];
if (configuration !== 'development' && configuration !== 'production') {
  throw new Error(
    'Use either "development" or "production" SEO configuration.',
  );
}

const frontendRoot = resolve(import.meta.dirname, '..');
const publicDirectory = resolve(frontendRoot, 'public');
const configPath = resolve(
  frontendRoot,
  'src',
  'environments',
  `site-config.${configuration as BuildConfiguration}.json`,
);
const config: SiteConfig = JSON.parse(await readFile(configPath, 'utf8'));
const siteUrl = validSiteUrl(config.siteUrl);
const indexingEnabled = config.indexingEnabled === true && siteUrl !== null;

await mkdir(publicDirectory, { recursive: true });
await writeFile(
  resolve(publicDirectory, 'robots.txt'),
  indexingEnabled
    ? `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`
    : 'User-agent: *\nAllow: /\n',
);

const sitemapPath = resolve(publicDirectory, 'sitemap.xml');
if (!indexingEnabled) {
  await rm(sitemapPath, { force: true });
} else {
  await writeFile(
    sitemapPath,
    buildSitemap(
      siteUrl!,
      routeSearchPolicy
        .filter((page) => page.disposition === RouteDisposition.Indexable)
        .map((page) => page.path),
      editorialDates,
      guideRegistry,
    ),
  );
}

function validSiteUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}
