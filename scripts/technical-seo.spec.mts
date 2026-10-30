import { execFileSync } from 'node:child_process';
import { withHtmlDocument } from './html-document.mts';
import {
  browserSnapshot,
  browserSnapshotExpression,
  pageReadyExpression,
  isNavigationContextError,
  logBrowserFindings,
} from './seo-browser-diagnostics.mts';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import {
  inspectSchema,
  blocksIndexing,
  expectedSelector,
  Severity,
  AuditStage,
  finding,
} from './technical-seo.mts';
import { inspectPublicHtml } from './seo-audit.mts';
import { PassThrough } from 'node:stream';
import { DevTools, compareRendered } from './seo-browser.mts';
import { discoverRouter } from './router-source.mts';
import { artifactFiles, artifactHash } from './seo-artifact.mts';
import { documentUrl } from './document-urls.mts';
import { robotsAccess } from './verify-production-routes.mts';

const page = (html: string) => ({
  route: '/examples',
  filePath: 'examples/index.html',
  html,
});
describe('technical SEO production pipeline regressions', () => {
  it('reads the actual router component independently of rendered metadata', () => {
    const route = discoverRouter().routes.find(
      (route) => route.path === '/examples',
    )!;
    expect(expectedSelector(route)).toBe('app-examples-page');
    const fallback = new JSDOM(
      '<title>Examples</title><link rel="canonical" href="https://www.inspectmesh.com/examples"><app-home-page><h1>Examples</h1></app-home-page>',
    );
    expect(
      fallback.window.document.querySelector(expectedSelector(route)),
    ).toBeNull();
    fallback.window.close();
    expect(() =>
      expectedSelector({ ...route, renderer: 'dynamicUnknownRenderer()' }),
    ).toThrow('unsupported renderer');
  });
  it('retains case, encoded slashes and the real document base', () => {
    const window = new JSDOM('<base href="/"><h2 id="x">Target</h2>').window;
    expect(
      documentUrl(window.document, '#x', 'https://www.inspectmesh.com/examples')
        .href,
    ).toBe('https://www.inspectmesh.com/#x');
    expect(
      documentUrl(
        window.document,
        '/A%2FB?q=1',
        'https://www.inspectmesh.com/examples',
      ).pathname,
    ).toBe('/A%2FB');
    window.close();
  });
  it('catches agent-specific blocking even with a permissive generic group', () => {
    expect(
      robotsAccess(
        'User-agent: *\nAllow: /\nUser-agent: Googlebot\nDisallow: /',
        '/examples',
        'Googlebot',
      ),
    ).toBe(false);
    const window = new JSDOM(
      '<meta name="ROBOTS" content="index"><meta name="googlebot" content="none">',
    ).window;
    expect(blocksIndexing(window.document)).toBe(true);
    window.close();
  });
  it('detects removed initial noindex and changed hydrated canonical', () => {
    const initial = inspectPublicHtml(
      page(
        '<title>Examples</title><link rel="canonical" href="https://www.inspectmesh.com/examples"><meta name="robots" content="noindex"><h1>Examples</h1><main>Example content</main>',
      ),
    );
    const result = compareRendered(
      initial,
      { ...initial, canonical: 'https://www.inspectmesh.com/', noindex: false },
      '/examples',
    );
    expect(result.map((finding) => finding.rule)).toEqual(
      expect.arrayContaining(['C02', 'I03']),
    );
  });
  it('parses all JSON-LD blocks including arrays and warns about recommended Article fields', () => {
    const window = new JSDOM(
      '<h1>Actual heading</h1><script type="application/ld+json">[{"@type":"Article","headline":"False heading"}]</script><script type="application/ld+json">{broken</script>',
    ).window;
    const result = inspectSchema(window.document, '/examples');
    expect(
      result.filter((f) => f.severity === Severity.Error).map((f) => f.rule),
    ).toEqual(['D02', 'D01']);
    expect(result.filter((f) => f.rule === 'D03')).toHaveLength(2);
    window.close();
  });
  it('allows useful visible FAQ content with no FAQPage schema', () => {
    const window = new JSDOM(
      '<main><h1>Examples</h1><h2>Question?</h2><p>A useful answer.</p></main>',
    ).window;
    expect(inspectSchema(window.document, '/examples')).toEqual([]);
    window.close();
  });
  it('changes release identity when a chunk changes or disappears', async () => {
    const directory = await mkdtemp(resolve(tmpdir(), 'inspectmesh-artifact-'));
    try {
      await mkdir(resolve(directory, 'examples'));
      await writeFile(resolve(directory, 'main-abcdefgh.js'), 'original');
      await writeFile(
        resolve(directory, 'examples/control.stl'),
        'intentionally malformed model control',
      );
      const before = artifactHash(await artifactFiles(directory));
      await writeFile(
        resolve(directory, 'main-abcdefgh.js'),
        'different bytes at same URL',
      );
      expect(artifactHash(await artifactFiles(directory))).not.toBe(before);
      const changed = artifactHash(await artifactFiles(directory));
      await rm(resolve(directory, 'main-abcdefgh.js'));
      expect(artifactHash(await artifactFiles(directory))).not.toBe(changed);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe('Chrome pipe protocol', () => {
  it('matches responses and preserves split UTF-8 frames', async () => {
    const output = new PassThrough();
    const input = new PassThrough();
    const client = new DevTools(output, input);
    output.once('data', (bytes: Buffer) => {
      const request = JSON.parse(bytes.toString().replace(/\0$/, ''));
      const response = Buffer.from(
        JSON.stringify({ id: request.id, result: { text: 'mm³' } }) + '\0',
      );
      const split = response.indexOf(Buffer.from('³')) + 1;
      input.write(response.subarray(0, split));
      input.write(response.subarray(split));
    });
    expect(await client.send('Browser.getVersion')).toEqual({ text: 'mm³' });
    client.close();
    input.end();
  });
  it('fails an unfinished audit when Chrome closes its pipe', async () => {
    const output = new PassThrough();
    const input = new PassThrough();
    const client = new DevTools(output, input);
    const request = client.send('Browser.getVersion');
    input.end();
    await expect(request).rejects.toThrow('pipe closed');
    client.close();
  });
});

describe('browser audit diagnostics and navigation probes', () => {
  it('waits safely before the new document root exists and rejects the previous route', () => {
    const window = new JSDOM('<app-examples-page></app-examples-page>', {
      url: 'https://www.inspectmesh.com/examples',
      runScripts: 'outside-only',
    }).window;
    window.document.documentElement.dataset['appReady'] = 'true';
    expect(
      window.eval(pageReadyExpression('/examples', 'app-examples-page')),
    ).toBe(true);
    expect(
      window.eval(pageReadyExpression('/guides', 'app-examples-page')),
    ).toBe(false);
    window.document.documentElement.remove();
    expect(
      window.eval(pageReadyExpression('/examples', 'app-examples-page')),
    ).toBe(false);
    window.close();
  });
  it('uses the actual Chrome snapshot probe to normalize whitespace and restrictive directives', () => {
    const window = new JSDOM(
      '<meta name="googlebot" content="none"><main><h1>Guide</h1><h2>Two\n  words</h2><p>Useful   content</p></main>',
      { url: 'https://www.inspectmesh.com/guide', runScripts: 'outside-only' },
    ).window;
    const result = window.eval(browserSnapshotExpression) as ReturnType<
      typeof browserSnapshot
    >;
    expect(result.main).toContain('Two words');
    expect(result.main).toContain('Useful content');
    expect(result.noindex).toBe(true);
    expect(result.href).toBe('https://www.inspectmesh.com/guide');
    window.document.documentElement.remove();
    expect(() => window.eval(browserSnapshotExpression)).not.toThrow();
    window.close();
  });
  it('prints exact rules, URLs and escaped evidence without hiding failures', () => {
    const messages: string[] = [];
    const evidence = 'first line\n::error::second line';
    logBrowserFindings(
      [
        finding(
          'H03',
          Severity.Error,
          '/examples',
          AuditStage.Render,
          evidence,
          'ready page',
        ),
        finding(
          'H03',
          Severity.Unknown,
          '/',
          AuditStage.Render,
          'Chrome unavailable',
          'browser',
        ),
      ],
      (line) => messages.push(line),
    );
    expect(messages).toHaveLength(2);
    expect(messages[0]).toContain(
      '[render:H03] ERROR https://www.inspectmesh.com/examples',
    );
    expect(messages[0]).toContain('first line\\n::error::second line');
    expect(messages[0]).not.toContain('\n');
    expect(messages[1]).toContain('UNKNOWN');
  });
  it('only retries navigation execution-context turnover', () => {
    expect(
      isNavigationContextError(new Error('Execution context was destroyed.')),
    ).toBe(true);
    expect(
      isNavigationContextError(
        new Error('Cannot find context with specified id'),
      ),
    ).toBe(true);
    expect(
      isNavigationContextError(
        new Error(
          "TypeError: Cannot read properties of null (reading 'dataset')",
        ),
      ),
    ).toBe(false);
    expect(
      isNavigationContextError(new Error('Real application bootstrap failure')),
    ).toBe(false);
  });
});

it('inspects inert HTML with its complete head and base, then releases the tree even on failure', () => {
  let released: Document | undefined;
  withHtmlDocument(
    '<!doctype html><html lang="en"><head><title>First</title>' +
      '<meta name="robots" content="noindex"><base href="/guides/">' +
      '<script>document.body.textContent = "executed";</script>' +
      '<script type="application/ld+json">{"@type":"Article"}</script></head>' +
      '<body><main id="evidence"><h1>Evidence</h1></main></body></html>',
    (document) => {
      released = document;
      expect(document.defaultView).toBeNull();
      expect(document.title).toBe('First');
      expect(document.documentElement.lang).toBe('en');
      expect(blocksIndexing(document)).toBe(true);
      expect(document.querySelector('h1')?.textContent).toBe('Evidence');
      expect(
        document.querySelector('script[type="application/ld+json"]')
          ?.textContent,
      ).toBe('{"@type":"Article"}');
      expect(
        documentUrl(
          document,
          'file#section',
          'https://www.inspectmesh.com/examples',
        ).href,
      ).toBe('https://www.inspectmesh.com/guides/file#section');
    },
  );
  expect(released?.childNodes.length).toBe(0);
  expect(() =>
    withHtmlDocument('<main id="failure">Failure</main>', (document) => {
      released = document;
      throw new Error('inspection failed');
    }),
  ).toThrow('inspection failed');
  expect(released?.childNodes.length).toBe(0);
  withHtmlDocument(
    '<title>Second</title><main>Independent</main>',
    (document) => {
      expect(document.title).toBe('Second');
      expect(document.querySelector('base')).toBeNull();
    },
  );
});

it('audits a large site in a bounded heap without dropping cross-page link checks', () => {
  const output = execFileSync(
    process.execPath,
    [
      '--max-old-space-size=256',
      '--experimental-strip-types',
      '--input-type=module',
      '-e',
      `
      import assert from 'node:assert/strict';
      import { validateGeneratedPages } from './scripts/check-internal-links.mts';
      import { inspectPublicHtml } from './scripts/seo-audit.mts';
      import { pageLinks } from './scripts/route-coverage.mts';
      import { discoveryLinks, breadcrumbConsistency } from './scripts/discovery-audit.mts';
      const body = Array.from({length: 200}, (_, i) => '<section id="s' + i + '"><h2>Evidence</h2><p>Scoped product claim and source.</p></section>').join('');
      const pages = Array.from({length: 160}, (_, i) => ({
        route: '/page-' + i, filePath: 'page-' + i + '/index.html',
        html: '<!doctype html><head><title>Page ' + i + '</title><link rel="canonical" href="https://www.inspectmesh.com/page-' + i + '"></head><body><main><h1>Page</h1>' + body + '<a href="/page-' + ((i+1)%160) + '#s199">Next evidence</a></main></body>',
      }));
      for (const page of pages) {
        inspectPublicHtml(page);
      }
      for (const page of pages) {
        assert.equal(pageLinks(page).length, 1);
      }
      for (const page of pages) {
        assert.equal(discoveryLinks(page).length, 1);
      }
      for (const page of pages) {
        assert.deepEqual(breadcrumbConsistency(page), []);
      }
      assert.deepEqual(validateGeneratedPages(pages), []);
      pages[159].html = pages[159].html.replace('id="s199"', 'id="removed"');
      assert.equal(validateGeneratedPages(pages).filter(f => f.reason === 'anchor not found').length, 1);
      console.log('bounded audit passed');
    `,
    ],
    {
      cwd: resolve(import.meta.dirname, '..'),
      encoding: 'utf8',
      timeout: 45000,
      maxBuffer: 1024 * 1024,
    },
  );
  expect(output.trim()).toBe('bounded audit passed');
}, 50000);
