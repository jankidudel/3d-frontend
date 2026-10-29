import { retiredRoutes, retirementDocuments } from './retired-routes.mts';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import {
  PageType,
  PublicRoutePath,
} from '../src/app/core/seo/public-routes.ts';
import {
  retiredToolDocuments,
  retireToolDocuments,
  verifyRetiredTools,
} from './retire-tool-documents.mts';

async function build() {
  const directory = await mkdtemp(join(tmpdir(), 'inspectmesh-retire-'));
  for (const route of Object.values(PublicRoutePath)) {
    if (route.pageType === PageType.Tool && route.path.startsWith('tools/')) {
      await mkdir(join(directory, route.path), { recursive: true });
      await writeFile(join(directory, route.path, 'index.html'), 'replacement');
    }
  }
  for (const policy of retiredRoutes) {
    await mkdir(join(directory, policy.currentPath), { recursive: true });
    await writeFile(
      join(directory, policy.currentPath, 'index.html'),
      'replacement',
    );
  }
  return directory;
}

it('deletes only retired tool HTML after checking all uploaded replacements', async () => {
  const directory = await build();
  const calls: string[][] = [];
  retireToolDocuments(directory, 'test-bucket', (args) => {
    calls.push(args);
    return '{}';
  });
  const deletion = calls.at(-1)!;
  expect(deletion.slice(0, 2)).toEqual(['s3api', 'delete-objects']);
  expect(
    deletion.slice(
      deletion.indexOf('--output'),
      deletion.indexOf('--output') + 2,
    ),
  ).toEqual(['--output', 'json']);
  const payload = JSON.parse(deletion.at(-1)!) as {
    Objects: { Key: string }[];
  };
  const keys = payload.Objects.map(({ Key }) => Key);
  expect(keys).toContain('3d-print-cost-calculator/index.html');
  expect(keys).toContain('3d-print-cost-calculator.html');
  expect(keys).toHaveLength(retirementDocuments().length);
  expect(keys).toContain('how-to-repair-an-stl-file/index.html');
  expect(keys).toContain('3d-printing-materials/index.html');
  expect(keys.every((key) => /^[a-z0-9-]+(?:\/index)?\.html$/.test(key))).toBe(
    true,
  );
  expect(keys).not.toContain('index.html');
  expect(keys).not.toContain('materials/index.html');
  expect(calls.slice(0, -1)).toHaveLength(retiredRoutes.length);
  expect(
    calls
      .slice(0, -1)
      .every(
        (args) =>
          args[1] === 'head-object' &&
          retiredRoutes.some(
            (policy) =>
              args.at(-1) === policy.currentPath.slice(1) + '/index.html',
          ),
      ),
  ).toBe(true);
});

it('never deletes if a local or uploaded replacement is missing', async () => {
  const incomplete = await mkdtemp(join(tmpdir(), 'inspectmesh-incomplete-'));
  expect(() => retiredToolDocuments(incomplete)).toThrow(
    'Replacement tool document missing',
  );
  const directory = await build();
  const calls: string[][] = [];
  expect(() =>
    retireToolDocuments(directory, 'test-bucket', (args) => {
      calls.push(args);
      throw new Error('Missing uploaded document');
    }),
  ).toThrow('Missing uploaded document');
  expect(calls.some((args) => args[1] === 'delete-objects')).toBe(false);
  await writeFile(join(directory, '3d-print-cost-calculator.html'), 'old');
  expect(() => retiredToolDocuments(directory)).toThrow(
    'Retired tool document remains',
  );
});

it('fails on partial S3 deletion errors', async () => {
  const directory = await build();
  expect(() =>
    retireToolDocuments(directory, 'test-bucket', (args) =>
      args[1] === 'delete-objects'
        ? '{"Errors":[{"Code":"AccessDenied"}]}'
        : '{}',
    ),
  ).toThrow('AccessDenied');
});

it('rejects live duplicate pages and redirects, accepting only 404/410', async () => {
  const directory = await build();
  for (const status of [200, 301, 302, 403, 500]) {
    await expect(
      verifyRetiredTools(directory, async () => new Response(null, { status })),
    ).rejects.toThrow(`returned ${status}`);
  }
  const urls: string[] = [];
  await verifyRetiredTools(directory, async (url, options) => {
    urls.push(String(url));
    expect(options?.redirect).toBe('manual');
    return new Response(null, { status: 404 });
  });
  expect(urls).toHaveLength(retiredRoutes.length);
  expect(urls).toContain(
    'https://www.inspectmesh.com/3d-print-cost-calculator',
  );
});

it('accepts empty quiet-mode success without hiding malformed responses or CLI failures', async () => {
  const directory = await build();
  for (const output of ['', ' \n', '{}']) {
    expect(() =>
      retireToolDocuments(directory, 'test-bucket', () => output),
    ).not.toThrow();
  }
  expect(() =>
    retireToolDocuments(directory, 'test-bucket', (args) => {
      if (args[1] === 'delete-objects') {
        throw new Error('AWS CLI failed');
      }
      return '{}';
    }),
  ).toThrow('AWS CLI failed');
  expect(() =>
    retireToolDocuments(directory, 'test-bucket', () => '{'),
  ).toThrow('Invalid retirement deletion response');
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
it('rejects malformed nonempty cleanup responses without confusing them with valid quiet success', async () => {
  const directory = await build();
  for (const output of [
    '{',
    '<html>failed</html>',
    'null',
    '[]',
    '{"Errors":"invalid"}',
  ]) {
    expect(() =>
      retireToolDocuments(directory, 'test-bucket', () => output),
    ).toThrow('Invalid retirement deletion response');
  }
});

it('reports the exact obsolete clean or .html object still served publicly', async () => {
  const { auditRetiredDelivery } = await import('./retired-routes.mts');
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
