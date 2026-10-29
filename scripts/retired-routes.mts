import {
  PageType,
  PublicRoutePath,
  PublicRouteUrl,
} from '../src/app/core/seo/public-routes.ts';
import { guideRegistry } from '../src/content/guides/guides.registry.ts';
import { guideRoutePath } from '../src/app/core/seo/public-routes.ts';

/** Known obsolete paths only. Correspondence is not a redirect instruction. */
export const retiredRoutes = [
  ...Object.values(PublicRoutePath)
    .filter(
      (route) =>
        route.pageType === PageType.Tool && route.path.startsWith('tools/'),
    )
    .map((route) => ({
      path: '/' + route.path.slice('tools/'.length),
      currentPath: '/' + route.path,
      expectedStatus: 404,
      reason:
        'Owner-approved retirement of a root-level tool; use its existing /tools/ page.',
    })),
  // Confirmed duplicate main documents observed 29 October; router has no aliases.
  {
    path: '/how-to-repair-an-stl-file',
    currentPath: guideRoutePath('how-to-repair-an-stl-file'),
    expectedStatus: 404,
    reason:
      'Obsolete independently self-canonical repair guide; the prefixed guide is the current owner.',
  },
  {
    path: '/3d-printing-materials',
    currentPath: PublicRouteUrl.Materials,
    expectedStatus: 404,
    reason:
      'Obsolete independently self-canonical material hub; /materials is the current owner.',
  },
] as const;

export interface Retirement {
  readonly path: string;
  readonly currentPath: string;
  readonly expectedStatus: number;
  readonly reason: string;
}
export function retirementDocuments(
  policies: readonly Retirement[] = retiredRoutes,
) {
  const currentPaths = new Set<string>([
    ...Object.values(PublicRouteUrl),
    ...guideRegistry.map((guide) => guideRoutePath(guide.slug)),
  ]);
  const keys = new Set<string>();
  for (const policy of policies) {
    if (
      !/^\/[a-z0-9-]+$/.test(policy.path) ||
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
            expectedStatus: 404,
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
