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

it('reports the exact obsolete clean or .html object still served publicly', async () => {
  const good = await auditRetiredDelivery(
    async () => new Response(null, { status: 404 }),
  );
  expect(good.complete).toBe(true);
  expect(good.failures).toEqual([]);
  const stale = await auditRetiredDelivery(
    async (url) =>
      new Response(null, {
        status: String(url).endsWith('/how-to-repair-an-stl-file.html')
          ? 200
          : 404,
      }),
  );
  expect(stale.failures).toEqual([
    'Retired URL /how-to-repair-an-stl-file.html (object how-to-repair-an-stl-file.html) returned 200; expected 404/410',
  ]);
});
