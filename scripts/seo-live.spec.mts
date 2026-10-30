import { describe, expect, it } from 'vitest';
import {
  auditLiveResources,
  liveAuditExitCode,
  logLiveFindings,
} from './seo-live.mts';
import { Severity } from './technical-seo.mts';
import { productionOrigin } from './route-search-policy.mts';

const canonical = productionOrigin + '/tools/stl-viewer';
const html = (owner = canonical) =>
  `<title>STL viewer</title><link rel="canonical" href="${owner}"><main><h1>STL viewer</h1><p>Preview a local model.</p></main>`;

function exitCode(result: Awaited<ReturnType<typeof auditLiveResources>>) {
  return liveAuditExitCode({
    complete: result.completed === result.expected,
    findings: result.findings,
  });
}

describe('complete live resource audit', () => {
  it('checks 140 query states and 192 assets without dropping queries after 120', async () => {
    const queries = Array.from(
      { length: 140 },
      (_, index) => `${canonical}?example=case-${index}`,
    );
    const assets = Array.from(
      { length: 192 },
      (_, index) => `${productionOrigin}/examples/asset-${index}.stl`,
    );
    const requested: string[] = [];
    let active = 0;
    let peak = 0;
    const request: typeof fetch = async (input) => {
      active++;
      peak = Math.max(peak, active);
      const url = String(input);
      requested.push(url);
      await new Promise<void>((resolve) => setImmediate(resolve));
      active--;
      return new Response(new URL(url).search ? html() : 'solid fixture', {
        headers: {
          'content-type': new URL(url).search ? 'text/html' : 'model/stl',
        },
      });
    };
    const result = await auditLiveResources(
      [...queries, queries[0]],
      [...assets, assets[0]],
      request,
    );
    expect(requested.sort()).toEqual([...queries, ...assets].sort());
    expect(result).toMatchObject({
      expected: 332,
      attempted: 332,
      completed: 332,
      findings: [],
    });
    expect(peak).toBe(3);
    expect(exitCode(result)).toBe(0);
  });

  it('still fails on a wrong canonical beyond the old 120-query cutoff', async () => {
    const queries = Array.from(
      { length: 140 },
      (_, index) => `${canonical}?example=case-${index}`,
    );
    const result = await auditLiveResources(
      queries,
      [],
      async (input) =>
        new Response(
          html(
            String(input) === queries[139]
              ? productionOrigin + '/tools/3mf-viewer'
              : canonical,
          ),
          { headers: { 'content-type': 'text/html' } },
        ),
    );
    expect(result.completed).toBe(140);
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        url: queries[139],
        rule: 'C03',
        severity: Severity.Error,
      }),
    );
    expect(exitCode(result)).toBe(1);
  });

  it('reports incomplete requests and invalid asset bodies as failures', async () => {
    const assets = ['offline', 'missing', 'empty', 'fallback'].map(
      (name) => `${productionOrigin}/examples/${name}.stl`,
    );
    const result = await auditLiveResources([], assets, async (input) => {
      if (String(input) === assets[0]) {
        throw new Error('request timed out');
      }
      if (String(input) === assets[1]) {
        return new Response('missing', { status: 404 });
      }
      if (String(input) === assets[2]) {
        return new Response('');
      }
      return new Response('<main>Fallback</main>', {
        headers: { 'content-type': 'text/html' },
      });
    });
    expect(result.completed).toBe(3);
    expect(
      result.findings.filter((item) => item.severity === Severity.Error),
    ).toHaveLength(3);
    expect(
      result.findings.filter((item) => item.severity === Severity.Unknown),
    ).toHaveLength(1);
    expect(exitCode(result)).toBe(2);
  });

  it('fails explicitly before fetching when an unexpected inventory exceeds the safety budget', async () => {
    let requests = 0;
    const assets = Array.from(
      { length: 1001 },
      (_, index) => `${productionOrigin}/examples/${index}.stl`,
    );
    const result = await auditLiveResources([], assets, async () => {
      requests++;
      return new Response('fixture');
    });
    expect(requests).toBe(0);
    expect(result).toMatchObject({
      expected: 1001,
      attempted: 0,
      completed: 0,
    });
    expect(result.findings[0].observed).toContain('1001 URLs');
    expect(result.findings[0].observed).toContain(
      'No resource URLs were checked',
    );
    expect(exitCode(result)).toBe(2);
  });

  it('prints failure evidence on one line in raw deployment logs', async () => {
    const result = await auditLiveResources(
      [],
      [productionOrigin + '/examples/offline.stl'],
      async () => {
        throw new Error('request failed\n::error::untrusted text');
      },
    );
    const lines: string[] = [];
    logLiveFindings(result.findings, (line) => lines.push(line));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('[live:L04] UNKNOWN');
    expect(lines[0]).toContain('/examples/offline.stl');
    expect(lines[0]).toContain('request failed');
    expect(lines[0]).not.toContain('\n');
  });
});
