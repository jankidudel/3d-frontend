import { boundedBytes } from './http-documents.mts';
import { pageLinks } from './route-coverage.mts';
import { inspectPublicHtml, productionOrigin } from './seo-audit.mts';
import { JSDOM } from 'jsdom';

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
export interface DeliveryHop {
  url: string;
  status: number;
  location: string | null;
  xRobotsTag: string | null;
  link: string | null;
}
export class DeliveryFailure extends Error {
  readonly hops: readonly DeliveryHop[];
  constructor(message: string, hops: readonly DeliveryHop[]) {
    super(message);
    this.hops = hops;
  }
}
export async function inspectDelivery(
  requestedUrl: string,
  request: typeof fetch = fetch,
) {
  const hops: DeliveryHop[] = [];
  const seen = new Set<string>();
  let url = requestedUrl;
  const started = performance.now();
  for (let index = 0; index < 8; index++) {
    if (seen.has(url)) {
      throw new DeliveryFailure(`Redirect loop at ${url}`, hops);
    }
    seen.add(url);
    const response = await request(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    }).catch((error: unknown) => {
      throw new DeliveryFailure(String(error), hops);
    });
    const location = response.headers.get('location');
    hops.push({
      url,
      status: response.status,
      location,
      xRobotsTag: response.headers.get('x-robots-tag'),
      link: response.headers.get('link'),
    });
    if (redirectStatuses.has(response.status)) {
      await response.body?.cancel();
      if (!location) {
        throw new DeliveryFailure(
          `Redirect without a Location at ${url}`,
          hops,
        );
      }
      const next = new URL(location, url);
      if (
        !['www.inspectmesh.com', 'inspectmesh.com'].includes(next.hostname) ||
        !['http:', 'https:'].includes(next.protocol)
      ) {
        throw new DeliveryFailure(
          `Unexpected redirect destination: ${next.origin}`,
          hops,
        );
      }
      url = next.href;
      continue;
    }
    const html = new TextDecoder().decode(await boundedBytes(response));
    const contentType = response.headers.get('content-type');
    const window = contentType?.includes('text/html')
      ? new JSDOM(html, { url }).window
      : null;
    const criticalAssets = window
      ? [
          ...new Set(
            [
              ...window.document.querySelectorAll(
                'script[src], link[rel="stylesheet"][href]',
              ),
            ]
              .map(
                (element) =>
                  new URL(
                    element.getAttribute('src') ??
                      element.getAttribute('href')!,
                    window.document.baseURI,
                  ).href,
              )
              .filter((asset) => new URL(asset).origin === productionOrigin),
          ),
        ]
      : [];
    const mainText =
      window?.document
        .querySelector('main')
        ?.textContent?.replace(/\s+/g, ' ')
        .trim() ?? null;
    window?.close();
    return {
      requestedUrl,
      finalUrl: url,
      status: response.status,
      hops,
      contentType,
      xRobotsTag: response.headers.get('x-robots-tag'),
      link: response.headers.get('link'),
      criticalAssets,
      responseTimeMs: Math.round(performance.now() - started),
      observedAt: new Date().toISOString(),
      raw: contentType?.includes('text/html')
        ? {
            ...inspectPublicHtml({
              filePath: 'live GET',
              route: new URL(url).pathname,
              html,
            }),
            mainText,
          }
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
  throw new DeliveryFailure('Redirect chain exceeded eight responses.', hops);
}
