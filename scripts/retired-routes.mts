import {
  MaterialRoutePath,
  MaterialSlug,
  PageType,
  PublicRoutePath,
  PublicRouteUrl,
} from '../src/app/core/seo/public-routes.ts';
import { guideRegistry } from '../src/content/guides/guides.registry.ts';
import { guideRoutePath } from '../src/app/core/seo/public-routes.ts';

/**
 * Guides were served at the site root (/<slug>) until commit 7e2055e moved
 * them under /guides/ on this date. Every guide published on or before it
 * was uploaded at the root, and deployments never delete objects, so those
 * root copies stayed live as self-canonical duplicates.
 */
export const GUIDE_PREFIX_MOVE_DATE = '2026-10-28';
/** The material section's previous name; its pages still exist under it. */
export const LEGACY_MATERIALS_SEGMENT = '3d-printing-materials';
/** Date the owner-approved 301 redirects went live in production. */
export const LEGACY_REDIRECTS_LIVE_DATE = '2026-11-21';

/**
 * Known obsolete paths. Since 2026-11-21 each clean path 301-redirects to its
 * currentPath (owner-approved). The CloudFront viewer-request function holds the
 * same map: keep 3d-infra/lib/constructs/legacy-redirects.ts identical.
 */
export const retiredRoutes = [
  ...Object.values(PublicRoutePath)
    .filter(
      (route) =>
        route.pageType === PageType.Tool && route.path.startsWith('tools/'),
    )
    .map((route) => ({
      path: '/' + route.path.slice('tools/'.length),
      currentPath: '/' + route.path,
      expectedStatus: 301,
      reason:
        'Owner-approved retirement of a root-level tool; 301 to its existing /tools/ page.',
    })),
  ...guideRegistry
    .filter(
      (guide) => guide.enabled && guide.publishDate <= GUIDE_PREFIX_MOVE_DATE,
    )
    .map((guide) => ({
      path: '/' + guide.slug,
      currentPath: guideRoutePath(guide.slug),
      expectedStatus: 301,
      reason:
        'Root-level copy left from before guides moved under /guides/; 301 to the /guides/ page.',
    })),
  {
    path: '/why-wont-my-stl-file-slice',
    currentPath: guideRoutePath('stl-file-wont-slice'),
    expectedStatus: 301,
    reason:
      'Root-level copy of a guide later renamed to stl-file-wont-slice; it stayed live as a self-canonical duplicate. 301 to the renamed /guides/ page.',
    redirectedOn: '2026-11-28',
  },
  {
    path: '/' + LEGACY_MATERIALS_SEGMENT,
    currentPath: PublicRouteUrl.Materials,
    expectedStatus: 301,
    reason:
      'Obsolete independently self-canonical material hub; 301 to /materials, the current owner.',
  },
  ...Object.entries(MaterialSlug).map(([key, slug]) => ({
    path: `/${LEGACY_MATERIALS_SEGMENT}/${slug}`,
    currentPath: '/' + MaterialRoutePath[key as keyof typeof MaterialSlug],
    expectedStatus: 301,
    reason:
      'Material page under the old section name; 301 to its /materials/ page.',
  })),
] as const;

export interface Retirement {
  readonly path: string;
  readonly currentPath: string;
  readonly expectedStatus: number;
  readonly reason: string;
  /** When the redirect was added, if later than LEGACY_REDIRECTS_LIVE_DATE. */
  readonly redirectedOn?: string;
}
export function retirementDocuments(
  policies: readonly Retirement[] = retiredRoutes,
) {
  const currentPaths = new Set<string>([
    ...Object.values(PublicRouteUrl),
    ...guideRegistry.map((guide) => guideRoutePath(guide.slug)),
    ...Object.values(MaterialRoutePath).map((path) => '/' + path),
  ]);
  const keys = new Set<string>();
  for (const policy of policies) {
    if (
      !/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(policy.path) ||
      currentPaths.has(policy.path) ||
      !currentPaths.has(policy.currentPath) ||
      policy.path === policy.currentPath
    ) {
      throw new Error(
        `Unsafe retirement policy: ${policy.path} -> ${policy.currentPath}`,
      );
    }
    for (const key of [
      policy.path.slice(1) + '/index.html',
      policy.path.slice(1) + '.html',
    ]) {
      if (keys.has(key)) {
        throw new Error(`Duplicate retirement key: ${key}`);
      }
      keys.add(key);
    }
  }
  if (!keys.size) {
    throw new Error('Empty retirement inventory; refusing cleanup');
  }
  return [...keys];
}

/** Read-only delivery check, independent from current-page eligibility. */
export async function auditRetiredDelivery(request: typeof fetch = fetch) {
  const rows: {
    path: string;
    objectKey: string;
    expectedStatus: number;
    status: number | null;
    failure: string | null;
  }[] = [];
  const objects = retirementDocuments();
  const redirectTargets = new Map<string, string>(
    retiredRoutes.map((policy) => [policy.path, policy.currentPath]),
  );
  for (let index = 0; index < objects.length; index += 4) {
    const batch = await Promise.all(
      objects.slice(index, index + 4).map(async (objectKey) => {
        const path = '/' + objectKey.replace(/\/index\.html$/, '');
        try {
          const response = await request('https://www.inspectmesh.com' + path, {
            method: 'GET',
            redirect: 'manual',
            signal: AbortSignal.timeout(15000),
          });
          await response.body?.cancel();
          const target = redirectTargets.get(path);
          if (target) {
            const expectedLocation = 'https://www.inspectmesh.com' + target;
            const location = response.headers.get('location');
            return {
              path,
              objectKey,
              expectedStatus: 301,
              status: response.status,
              failure:
                response.status === 301 && location === expectedLocation
                  ? null
                  : `Retired URL ${path} returned ${response.status}${location ? ' -> ' + location : ''}; expected 301 -> ${expectedLocation}`,
            };
          }
          return {
            path,
            objectKey,
            expectedStatus: 404,
            status: response.status,
            failure: [404, 410].includes(response.status)
              ? null
              : `Retired URL ${path} (object ${objectKey}) returned ${response.status}; expected 404/410`,
          };
        } catch (error) {
          return {
            path,
            objectKey,
            expectedStatus: redirectTargets.has(path) ? 301 : 404,
            status: null,
            failure: `Retired URL ${path} unobserved: ${String(error)}`,
          };
        }
      }),
    );
    rows.push(...batch);
  }
  return {
    rows,
    complete: rows.every((row) => row.status !== null),
    failures: rows.flatMap((row) => (row.failure ? [row.failure] : [])),
  };
}
