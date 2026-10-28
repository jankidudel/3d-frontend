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
