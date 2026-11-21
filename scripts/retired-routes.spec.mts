import { expect, it } from 'vitest';
import {
  auditRetiredDelivery,
  retiredRoutes,
  retirementDocuments,
} from './retired-routes.mts';

it('derives clean and .html object keys for every retired path', () => {
  const keys = retirementDocuments();
  expect(keys).toHaveLength(retiredRoutes.length * 2);
  for (const policy of retiredRoutes) {
    const key = policy.path.slice(1);
    expect(keys).toContain(key + '/index.html');
    expect(keys).toContain(key + '.html');
  }
});

it('rejects empty policy inventories, current outputs and unregistered replacements before cleanup', () => {
  expect(() => retirementDocuments([])).toThrow('Empty retirement inventory');
  expect(() =>
    retirementDocuments([
      {
        path: '/tools/stl-viewer',
        currentPath: '/tools/stl-viewer',
        expectedStatus: 404,
        reason: 'invalid',
      },
    ]),
  ).toThrow('Unsafe retirement policy');
  expect(() =>
    retirementDocuments([
      {
        path: '/old-tool',
        currentPath: '/tools/unknown',
        expectedStatus: 404,
        reason: 'invalid',
      },
    ]),
  ).toThrow('Unsafe retirement policy');
});

const redirectingDelivery =
  (override?: (path: string) => Response | undefined) =>
  async (url: string | URL | Request) => {
    const path = new URL(String(url)).pathname;
    const custom = override?.(path);
    if (custom) {
      return custom;
    }
    const policy = retiredRoutes.find((entry) => entry.path === path);
    return policy
      ? new Response(null, {
          status: 301,
          headers: {
            location: 'https://www.inspectmesh.com' + policy.currentPath,
          },
        })
      : new Response(null, { status: 404 });
  };

it('expects clean retired paths to 301 to their owner and .html objects to be absent', async () => {
  const good = await auditRetiredDelivery(redirectingDelivery());
  expect(good.complete).toBe(true);
  expect(good.failures).toEqual([]);
  const stale = await auditRetiredDelivery(
    redirectingDelivery((path) =>
      path === '/how-to-repair-an-stl-file.html'
        ? new Response(null, { status: 200 })
        : undefined,
    ),
  );
  expect(stale.failures).toEqual([
    'Retired URL /how-to-repair-an-stl-file.html (object how-to-repair-an-stl-file.html) returned 200; expected 404/410',
  ]);
});

it('reports a retired clean path that is not redirected to its owner', async () => {
  const result = await auditRetiredDelivery(
    redirectingDelivery((path) =>
      path === '/3d-printing-materials'
        ? new Response(null, { status: 404 })
        : undefined,
    ),
  );
  expect(result.failures).toEqual([
    'Retired URL /3d-printing-materials returned 404; expected 301 -> https://www.inspectmesh.com/materials',
  ]);
});
