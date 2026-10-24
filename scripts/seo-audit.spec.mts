import { describe, expect, it } from 'vitest';
import {
  htmlFailures,
  inspectPublicHtml,
  shortestPaths,
} from './seo-audit.mts';
import { inspectDelivery } from './audit-production.mts';

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
  });
});
