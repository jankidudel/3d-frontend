import {
  canonicalPublicRoutePaths,
  getPublicRouteForUrl,
} from '../src/app/core/seo/public-routes.ts';
import { guideRoutePaths } from '../src/app/features/guides/generated/guide-route-data.generated.ts';
import { guideRegistry } from '../src/content/guides/guides.registry.ts';
import { editorialDates } from './editorial-dates.mts';

export const productionOrigin = 'https://www.inspectmesh.com';
export const RouteDisposition = {
  Indexable: 'indexable-canonical',
  Excluded: 'sitemap-excluded',
  Draft: 'non-indexable-draft',
  NotFound: 'not-found',
} as const;
export type RouteDisposition =
  (typeof RouteDisposition)[keyof typeof RouteDisposition];
export const RouteRendering = { Prerendered: 'prerendered' } as const;
export const QueryPolicy = { CanonicalBase: 'canonical-base' } as const;
export interface RouteSearchPolicy {
  readonly sitemap?: boolean;
  readonly expectedStatus?: number;
  readonly queryPolicy?: typeof QueryPolicy.CanonicalBase;
  readonly owner?: string;
  readonly reviewBy?: string;

  readonly id: string;
  readonly path: string;
  readonly pageType: string;
  readonly disposition: RouteDisposition;
  readonly reason: string;
  readonly canonical: string | null;
  readonly noindex: boolean;
  readonly rendering: typeof RouteRendering.Prerendered;
  readonly lastmod: string | null;
  readonly lastmodSource: string;
  readonly source: string;
}

/** Preserve the established public registry and its deliberate sitemap exclusions. */
const policies: readonly RouteSearchPolicy[] = [
  ...[
    ...canonicalPublicRoutePaths.map((path) => `/${path}`),
    ...guideRoutePaths,
  ].map((path) => {
    const guide = guideRegistry.find((entry) => `/${entry.slug}` === path);
    return {
      id: path === '/' ? 'home' : path.slice(1),
      path,
      pageType: guide
        ? 'guide'
        : (getPublicRouteForUrl(path)?.pageType ?? 'catalogue'),
      disposition: RouteDisposition.Indexable,
      reason:
        'Established canonical public task owner; retained in the maintained public/content registry.',
      canonical: productionOrigin + path,
      noindex: false,
      rendering: RouteRendering.Prerendered,
      lastmod: guide
        ? (guide.updatedDate ?? guide.publishDate)
        : (editorialDates[path] ?? null),
      lastmodSource: guide
        ? 'src/content/guides/guides.registry.ts'
        : 'scripts/editorial-dates.mts',
      source: guide ? 'Published guide registry' : 'canonicalPublicRoutePaths',
    };
  }),
  ...['/privacy', '/cookies'].map((path) => ({
    id: path.slice(1),
    path,
    pageType: 'legal',
    disposition: RouteDisposition.Excluded,
    reason:
      'Existing navigable legal/consent utility intentionally omitted from the sitemap. Existing index,follow and self-canonical are preserved; omission is not a noindex instruction.',
    canonical: productionOrigin + path,
    noindex: false,
    rendering: RouteRendering.Prerendered,
    lastmod: null,
    lastmodSource: 'No sitemap date required for this intentional exclusion.',
    source: 'PublicRoutePath Legal pages and SeoService.apply',
  })),
  {
    id: 'printer-review-draft',
    path: '/3d-printers/review-draft',
    pageType: 'draft',
    disposition: RouteDisposition.Draft,
    reason: 'Unpublished review template without completed hands-on evidence.',
    canonical: null,
    noindex: true,
    rendering: RouteRendering.Prerendered,
    lastmod: null,
    lastmodSource: 'Unpublished draft; no sitemap date.',
    source: 'PrinterReviewDraftPage.applyNoIndex',
  },
  {
    id: 'not-found',
    path: '/404',
    pageType: 'not-found',
    disposition: RouteDisposition.NotFound,
    reason:
      'Not-found document; the wildcard handler serves unknown requests, not a finite search page.',
    canonical: null,
    noindex: true,
    rendering: RouteRendering.Prerendered,
    lastmod: null,
    lastmodSource: 'Error document; no sitemap date.',
    source: 'NotFoundPage.applyNoIndex',
  },
];

export const routeSearchPolicy: readonly RouteSearchPolicy[] = policies.map(
  (policy) => ({
    ...policy,
    sitemap: policy.disposition === RouteDisposition.Indexable,
    expectedStatus:
      policy.disposition === RouteDisposition.NotFound ? 404 : 200,
    queryPolicy: QueryPolicy.CanonicalBase,
    owner: 'InspectMesh',
    ...(policy.disposition !== RouteDisposition.Indexable
      ? { reviewBy: '2027-01-27' }
      : {}),
  }),
);
