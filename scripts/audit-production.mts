import { boundedBytes } from './http-documents.mts';
import { pageLinks } from './route-coverage.mts';
import { inspectPublicHtml, productionOrigin } from './seo-audit.mts';

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
      signal: AbortSignal.timeout(5000),
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
    const html = new TextDecoder().decode(await boundedBytes(response));
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
      linkEvidence: contentType?.includes('text/html')
        ? pageLinks({
            filePath: 'live GET',
            route: new URL(url).pathname,
            html,
          })
        : [],
      renderedCanonical: null,
      renderedRobots: null,
      limitation:
        'GET evidence only; browser rendering, real Googlebot access and URL Inspection are separate checks.',
    };
  }
  throw new Error('Redirect chain exceeded eight responses.');
}
