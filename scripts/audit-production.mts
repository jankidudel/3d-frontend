import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  htmlFailures,
  inspectPublicHtml,
  productionOrigin,
} from './seo-audit.mts';

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
export async function inspectDelivery(
  requestedUrl: string,
  request: typeof fetch = fetch,
) {
  const hops: { url: string; status: number; location: string | null }[] = [];
  const seen = new Set<string>();
  let url = requestedUrl;
  const started = performance.now();
  for (let index = 0; index < 8; index++) {
    if (seen.has(url)) {
      throw new Error(`Redirect loop at ${url}`);
    }
    seen.add(url);
    const response = await request(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
    });
    const location = response.headers.get('location');
    hops.push({ url, status: response.status, location });
    if (redirectStatuses.has(response.status)) {
      await response.body?.cancel();
      if (!location) {
        throw new Error(`Redirect without a Location at ${url}`);
      }
      const next = new URL(location, url);
      if (
        !['www.inspectmesh.com', 'inspectmesh.com'].includes(next.hostname) ||
        !['http:', 'https:'].includes(next.protocol)
      ) {
        throw new Error(`Unexpected redirect destination: ${next.origin}`);
      }
      url = next.href;
      continue;
    }
    const html = await response.text();
    const contentType = response.headers.get('content-type');
    return {
      requestedUrl,
      finalUrl: url,
      status: response.status,
      hops,
      contentType,
      xRobotsTag: response.headers.get('x-robots-tag'),
      responseTimeMs: Math.round(performance.now() - started),
      observedAt: new Date().toISOString(),
      raw: contentType?.includes('text/html')
        ? inspectPublicHtml({
            filePath: 'live GET',
            route: new URL(url).pathname,
            html,
          })
        : null,
      renderedCanonical: null,
      renderedRobots: null,
      limitation:
        'GET evidence only; browser rendering, real Googlebot access and URL Inspection are separate checks.',
    };
  }
  throw new Error('Redirect chain exceeded eight responses.');
}

async function run() {
  const path = resolve(import.meta.dirname, '../docs/seo-url-ledger.json');
  const ledger = JSON.parse(await readFile(path, 'utf8'));
  // Fail before a full crawl if the environment cannot resolve the site.
  await inspectDelivery(productionOrigin + '/');
  const failures = [];
  for (const row of ledger.pages) {
    try {
      row.live = await inspectDelivery(productionOrigin + row.path);
      if (
        row.live.status !== 200 ||
        row.live.finalUrl !== productionOrigin + row.path ||
        !row.live.raw
      ) {
        failures.push({
          path: row.path,
          error: 'Canonical URL did not return its own HTML with status 200.',
        });
      }
      if (row.live.raw) {
        for (const error of htmlFailures(row.path, row.live.raw)) {
          failures.push({ path: row.path, error });
        }
      }
      if (/(?:noindex|\bnone\b)/i.test(row.live.xRobotsTag ?? '')) {
        failures.push({
          path: row.path,
          error: 'HTTP X-Robots-Tag excludes the intended indexable page.',
        });
      }
    } catch (error) {
      failures.push({ path: row.path, error: String(error) });
    }
  }
  const variants = [
    'http://inspectmesh.com/stl-viewer?seo-audit=1',
    'https://inspectmesh.com/stl-viewer?seo-audit=1',
    'http://www.inspectmesh.com/stl-viewer?seo-audit=1',
    productionOrigin + '/stl-viewer/',
    productionOrigin + '/stl-viewer/index.html',
    productionOrigin + '/stl-viewer?seo-audit=1',
    productionOrigin + '/seo-audit-missing-route-20261024',
  ];
  for (const url of variants) {
    const prior = ledger.additionalUrls.findIndex(
      (row: { requestedUrl: string }) => row.requestedUrl === url,
    );
    try {
      const observation = await inspectDelivery(url);
      if (
        url.includes('/seo-audit-missing-route-') &&
        observation.status !== 404
      ) {
        failures.push({
          path: url,
          error: 'Unknown route must return a genuine 404.',
        });
      }
      if (prior >= 0) {
        ledger.additionalUrls[prior] = observation;
      } else {
        ledger.additionalUrls.push(observation);
      }
    } catch (error) {
      failures.push({ path: url, error: String(error) });
    }
  }
  if (process.argv.includes('--write')) {
    await writeFile(path, JSON.stringify(ledger, null, 2) + '\n');
  }
  console.log(
    JSON.stringify({ checked: ledger.pages.length, failures }, null, 2),
  );
  if (failures.length) {
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await run();
}
