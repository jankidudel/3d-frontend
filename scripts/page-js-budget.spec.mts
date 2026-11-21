import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PAGE_JS_BUDGET_BYTES,
  initialScripts,
  measurePages,
  overBudget,
} from './page-js-budget.mts';

describe('page JavaScript budget', () => {
  it('counts the module entry and every modulepreload once, ignoring other links', () => {
    const html = `
      <link rel="stylesheet" href="styles-ABCDEFGH.css">
      <link rel="modulepreload" href="chunk-AAAAAAAA.js">
      <link rel="preload" as="image" href="/logo.webp">
      <script src="main-BBBBBBBB.js" type="module"></script>
      <link rel="modulepreload" href="chunk-AAAAAAAA.js">
      <script src="https://example.com/external.js"></script>`;
    expect(initialScripts(html)).toEqual([
      'chunk-AAAAAAAA.js',
      'main-BBBBBBBB.js',
    ]);
  });

  it('reports pages whose up-front JavaScript exceeds the budget', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'inspectmesh-js-budget-'));
    await mkdir(join(directory, 'heavy'));
    await writeFile(join(directory, 'main-BBBBBBBB.js'), 'export {};');
    // Random bytes do not compress, so this chunk stays over the budget.
    const incompressible = Buffer.from(
      Array.from({ length: PAGE_JS_BUDGET_BYTES + 4096 }, () =>
        Math.floor(Math.random() * 256),
      ),
    );
    await writeFile(join(directory, 'chunk-HEAVYHEAVY.js'), incompressible);
    await writeFile(
      join(directory, 'index.html'),
      '<script src="main-BBBBBBBB.js" type="module"></script>',
    );
    await writeFile(
      join(directory, 'heavy', 'index.html'),
      '<link rel="modulepreload" href="chunk-HEAVYHEAVY.js"><script src="main-BBBBBBBB.js" type="module"></script>',
    );
    const pages = await measurePages(directory);
    expect(overBudget(pages).map((page) => page.page)).toEqual([
      '/heavy/index.html',
    ]);
  });
});
