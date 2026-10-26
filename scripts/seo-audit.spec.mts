import { describe, expect, it } from 'vitest';
import {
  htmlFailures,
  inspectPublicHtml,
  shortestPaths,
} from './seo-audit.mts';
import { DeliveryFailure, inspectDelivery } from './audit-production.mts';
import {
  headerCanonicals,
  verifyCriticalAssets,
  verifyVariants,
} from './delivery-diagnostics.mts';

describe('initial HTML evidence', () => {
  it('rejects a shared app shell with the wrong canonical and no answer', () => {
    const observation = inspectPublicHtml({
      filePath: 'tool/index.html',
      route: '/tool',
      html: '<title>InspectMesh</title><link rel="canonical" href="https://www.inspectmesh.com/"><app-root></app-root>',
    });
    expect(htmlFailures('/tool', observation)).toHaveLength(3);
  });
  it('keeps Googlebot exclusion separate from a generic index directive', () => {
    const observation = inspectPublicHtml({
      filePath: 'tool/index.html',
      route: '/tool',
      html: '<title>Tool</title><meta name="description" content="A useful tool"><meta name="robots" content="index,follow"><meta name="googlebot" content="noindex"><link rel="canonical" href="https://www.inspectmesh.com/tool"><main><h1>Tool</h1><p>Actual answer</p></main>',
    });
    expect(htmlFailures('/tool', observation)).toEqual([
      'An intended indexable route has a blocking robots directive.',
    ]);
  });
  it('does not confuse navigation links with contextual links', () => {
    const observation = inspectPublicHtml({
      filePath: 'index.html',
      route: '/',
      html: '<nav><a href="/tools">Tools</a></nav><main><h1>Home</h1><a href="/tool#result">Check a file</a><a href="/examples/cube.stl" download>Cube</a></main>',
    });
    expect(observation.contextualLinks).toEqual(['/tool']);
    expect(observation.links).toEqual(['/tools', '/tool']);
    expect(observation.exampleAssets).toEqual(['/examples/cube.stl']);
  });
  it('detects unreachable pages and resolves cycles without inflating depth', () => {
    const depths = shortestPaths(
      new Map([
        ['/', ['/tools']],
        ['/tools', ['/', '/tool']],
        ['/tool', ['/tools']],
        ['/orphan', []],
      ]),
    );
    expect(depths.get('/tool')).toBe(2);
    expect(depths.has('/orphan')).toBe(false);
  });
});

describe('production GET evidence', () => {
  it('reads canonical HTTP links without mistaking preload or alternate links for canonicals', () => {
    expect(
      headerCanonicals(
        '<chunk.js>; rel="preload", </wrong>; rel="canonical alternate"',
        'https://www.inspectmesh.com/tool',
      ),
    ).toEqual(['https://www.inspectmesh.com/wrong']);
  });
  it('records host/path/query variants independently and detects lost queries', async () => {
    const request: typeof fetch = async (input) =>
      String(input).startsWith('http:')
        ? new Response(null, {
            status: 301,
            headers: { location: 'https://www.inspectmesh.com/tool' },
          })
        : new Response(
            '<link rel="canonical" href="https://www.inspectmesh.com/tool"><main><h1>Tool</h1></main>',
            { headers: { 'content-type': 'text/html' } },
          );
    const result = await verifyVariants(request, [
      {
        requestedUrl: 'http://inspectmesh.com/tool?seo-audit=1',
        expectedCanonical: 'https://www.inspectmesh.com/tool',
        expectedStatus: 200,
      },
    ]);
    expect(result[0].failures).toContain(
      'Redirect changed the diagnostic query string.',
    );
    expect(result[0].status).toBe(200);
  });
  it('detects missing hashed resources and HTML masquerading as JavaScript', async () => {
    const observation = await inspectDelivery(
      'https://www.inspectmesh.com/tool',
      async () =>
        new Response(
          '<script src="/main-abc.js"></script><link rel="stylesheet" href="/styles-abc.css"><script src="https://third-party.example/widget.js"></script>',
          { headers: { 'content-type': 'text/html' } },
        ),
    );
    expect(observation.criticalAssets).toEqual([
      'https://www.inspectmesh.com/main-abc.js',
      'https://www.inspectmesh.com/styles-abc.css',
    ]);
    let requests = 0;
    const result = await verifyCriticalAssets(
      [...observation.criticalAssets, ...observation.criticalAssets],
      async (input) => {
        requests++;
        return String(input).endsWith('.js')
          ? new Response('<h1>App fallback</h1>', {
              headers: { 'content-type': 'text/html' },
            })
          : new Response('Not found', { status: 404 });
      },
    );
    expect(requests).toBe(2);
    expect(result.results.every((asset) => asset.failure)).toBe(true);
    expect(result.truncated).toBe(false);
  });
  it('resolves relative bundles against the document base on deep routes', async () => {
    const result = await inspectDelivery(
      'https://www.inspectmesh.com/compare/printers',
      async () =>
        new Response(
          '<base href="/"><script src="main-hash.js"></script><link rel="stylesheet" href="styles-hash.css">',
          { headers: { 'content-type': 'text/html' } },
        ),
    );
    expect(result.criticalAssets).toEqual([
      'https://www.inspectmesh.com/main-hash.js',
      'https://www.inspectmesh.com/styles-hash.css',
    ]);
  });
  it('records each hop and final HTTP robots independently of HTML', async () => {
    const request: typeof fetch = async (input) =>
      String(input).startsWith('http:')
        ? new Response(null, {
            status: 301,
            headers: { location: 'https://www.inspectmesh.com/tool?x=1' },
          })
        : new Response('<main><h1>Tool</h1></main>', {
            headers: { 'content-type': 'text/html', 'x-robots-tag': 'noindex' },
          });
    const result = await inspectDelivery(
      'http://inspectmesh.com/tool?x=1',
      request,
    );
    expect(result.hops.map((hop) => hop.status)).toEqual([301, 200]);
    expect(result.finalUrl).toBe('https://www.inspectmesh.com/tool?x=1');
    expect(result.xRobotsTag).toBe('noindex');
    expect(result.raw?.robots).toEqual([]);
    expect(result.renderedCanonical).toBeNull();
  });
  it('rejects a loop instead of treating it as a successful canonical response', async () => {
    const request: typeof fetch = async () =>
      new Response(null, { status: 302, headers: { location: '/tool' } });
    await expect(
      inspectDelivery('https://www.inspectmesh.com/tool', request),
    ).rejects.toThrow('Redirect loop');
    const result = await verifyVariants(request, [
      {
        requestedUrl: 'https://www.inspectmesh.com/tool',
        expectedCanonical: 'https://www.inspectmesh.com/tool',
        expectedStatus: 200,
      },
    ]);
    expect(result[0].hops).toHaveLength(1);
    expect(result[0].status).toBeNull();
  });
  it('retains observed redirect hops when the next request fails', async () => {
    const request: typeof fetch = async (input) => {
      if (String(input).startsWith('http:')) {
        return new Response(null, {
          status: 301,
          headers: { location: 'https://www.inspectmesh.com/tool' },
        });
      }
      throw new Error('Network unavailable');
    };
    try {
      await inspectDelivery('http://inspectmesh.com/tool', request);
      expect.fail('Expected the fetch failure.');
    } catch (error) {
      expect(error).toBeInstanceOf(DeliveryFailure);
      expect((error as DeliveryFailure).hops.map((hop) => hop.status)).toEqual([
        301,
      ]);
    }
  });
});
