import { format, resolveConfig } from 'prettier';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { discoverRouter } from './router-source.mts';
import { routeSearchPolicy } from './route-search-policy.mts';
import { loadGeneratedPages } from './check-internal-links.mts';
import { auditRouteCoverage, parseSitemapXml } from './route-coverage.mts';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist/3d-frontend/browser');
const sitemap = parseSitemapXml(
  await readFile(resolve(output, 'sitemap.xml'), 'utf8'),
);
if (sitemap.kind !== 'urlset') {
  throw new Error(
    'The local build currently produces one urlset; sitemap indexes require an explicit local resolver.',
  );
}
const result = auditRouteCoverage(
  discoverRouter(),
  routeSearchPolicy,
  await loadGeneratedPages(output),
  sitemap.entries,
);
if (process.argv.includes('--write')) {
  const path = resolve(root, 'docs/seo-url-ledger.json');
  const ledger = JSON.parse(await readFile(path, 'utf8'));
  const { rows, ...summary } = result;
  for (const row of ledger.pages) {
    const facts = rows.find((candidate) => candidate.path === row.path);
    if (facts) {
      const { observed: _observed, ...coverage } = facts;
      row.routeCoverage = coverage;
    }
  }
  ledger.routeCoverage = {
    ...summary,
    observedAt: new Date().toISOString(),
    scope: 'Local built route coverage, not HTTP delivery or Google indexing.',
  };
  await writeFile(
    path,
    await format(JSON.stringify(ledger), {
      ...(await resolveConfig(path)),
      parser: 'json',
    }),
  );
}
console.log(
  JSON.stringify(
    {
      counts: result.counts,
      differences: result.differences,
      exclusions: result.exclusions.map((p) => ({
        path: p.path,
        noindex: p.noindex,
        canonical: p.canonical,
        reason: p.reason,
      })),
      failures: result.failures,
    },
    null,
    2,
  ),
);
if (result.failures.length) {
  process.exitCode = 1;
}
