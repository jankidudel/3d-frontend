import { DeliveryFailure, inspectDelivery } from './audit-production.mts';
import { boundedBytes } from './http-documents.mts';
import { productionOrigin } from './route-search-policy.mts';

export interface VariantCheck {
  requestedUrl: string;
  expectedCanonical: string | null;
  expectedStatus: number;
}

/** Fixed representative diagnostics, never a grid of arbitrary query states. */
export const deliveryVariants: readonly VariantCheck[] = [
  ...[
    'http://inspectmesh.com/tools/stl-viewer?seo-audit=1',
    'https://inspectmesh.com/tools/stl-viewer?seo-audit=1',
    'http://www.inspectmesh.com/tools/stl-viewer?seo-audit=1',
    productionOrigin + '/tools/stl-viewer/',
    productionOrigin + '/tools/stl-viewer/index.html',
    productionOrigin + '/tools/stl-viewer?seo-audit=1',
  ].map((requestedUrl) => ({
    requestedUrl,
    expectedCanonical: productionOrigin + '/tools/stl-viewer',
    expectedStatus: 200,
  })),
  {
    requestedUrl: productionOrigin + '/seo-audit-missing-route-20261024',
    expectedCanonical: null,
    expectedStatus: 404,
  },
];

export function headerCanonicals(header: string | null, base: string) {
  const urls: string[] = [];
  for (const match of (header ?? '').matchAll(/<([^>]+)>\s*([^,]*)/g)) {
    const rel = match[2].match(/(?:^|;)\s*rel\s*=\s*(?:"([^"]*)"|([^;\s]+))/i);
    if (
      (rel?.[1] ?? rel?.[2] ?? '')
        .toLowerCase()
        .split(/\s+/)
        .includes('canonical')
    ) {
      urls.push(new URL(match[1], base).href);
    }
  }
  return urls;
}

export async function verifyVariants(
  request: typeof fetch,
  variants: readonly VariantCheck[] = deliveryVariants,
) {
  const results = [];
  // Sequential, seven ordinary requests plus bounded redirect hops.
  for (const variant of variants) {
    try {
      const response = await inspectDelivery(variant.requestedUrl, request);
      const failures: string[] = [];
      if (response.status !== variant.expectedStatus) {
        failures.push(
          `Expected HTTP ${variant.expectedStatus}, received ${response.status}.`,
        );
      }
      if (variant.expectedCanonical) {
        if (
          !response.raw ||
          response.raw.canonical !== variant.expectedCanonical
        ) {
          failures.push(
            'Variant does not identify its intended canonical page.',
          );
        }
        if (new URL(response.finalUrl).origin !== productionOrigin) {
          failures.push(
            'Host/protocol variant did not reach canonical HTTPS www origin.',
          );
        }
        const original = new URL(variant.requestedUrl);
        if (
          original.search &&
          new URL(response.finalUrl).search !== original.search
        ) {
          failures.push('Redirect changed the diagnostic query string.');
        }
      }
      results.push({ ...variant, ...response, failures });
    } catch (error) {
      results.push({
        ...variant,
        status: null,
        finalUrl: null,
        hops: error instanceof DeliveryFailure ? error.hops : [],
        observedAt: new Date().toISOString(),
        limitation: String(error),
        failures: ['Delivery unavailable; no redirect outcome inferred.'],
      });
    }
  }
  return results;
}

/** Check only scripts/styles actually referenced by fetched initial documents. */
export async function verifyCriticalAssets(
  urls: readonly string[],
  request: typeof fetch,
) {
  const unique = [...new Set(urls)];
  const maxAssets = 80;
  const results = [];
  for (let index = 0; index < Math.min(unique.length, maxAssets); index += 3) {
    const batch = unique.slice(index, Math.min(index + 3, maxAssets));
    results.push(
      ...(await Promise.all(
        batch.map(async (url) => {
          try {
            const response = await request(url, {
              redirect: 'manual',
              signal: AbortSignal.timeout(5000),
            });
            const bytes = await boundedBytes(response);
            const contentType = response.headers.get('content-type');
            const expected = new URL(url).pathname.endsWith('.css')
              ? /text\/css/i
              : /(?:java|ecma)script/i;
            return {
              url,
              status: response.status,
              contentType,
              bytes: bytes.length,
              failure:
                response.status !== 200 ||
                !bytes.length ||
                !expected.test(contentType ?? '')
                  ? 'Referenced script/style is unavailable, empty or has the wrong content type.'
                  : null,
            };
          } catch (error) {
            return {
              url,
              status: null,
              contentType: null,
              bytes: null,
              failure: String(error),
            };
          }
        }),
      )),
    );
  }
  return { results, truncated: unique.length > maxAssets, maxAssets };
}
