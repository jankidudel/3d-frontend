import { describe, expect, it } from 'vitest';
import {
  auditDiscovery,
  breadcrumbConsistency,
  discoveryLinks,
  LinkKind,
} from './discovery-audit.mts';
import { validateGeneratedPages } from './check-internal-links.mts';
import { routeSearchPolicy, productionOrigin } from './route-search-policy.mts';
const page = (route: string, html: string) => ({
  route,
  filePath: route + '/index.html',
  html: '<base href="/">' + html,
});
const policies = routeSearchPolicy.filter((policy) =>
  ['/', '/tools/stl-viewer'].includes(policy.path),
);

describe('current-route discovery regressions', () => {
  it('accepts known retirements without admitting current tool failures or stale content links', () => {
    const pages = [
      page('/', '<main><a href="/tools/stl-viewer">Open STL</a></main>'),
      page('/tools/stl-viewer', '<main>Current</main>'),
    ];
    expect(
      auditDiscovery(pages, [], policies, []).failures.filter((failure) =>
        failure.includes('Stale'),
      ),
    ).toEqual([]);
    pages[0] = page('/', '<main><a href="/stl-viewer">Open STL</a></main>');
    expect(auditDiscovery(pages, [], policies, []).failures).toContain(
      'Stale retired link: //index.html: a[href="/stl-viewer"] -> /stl-viewer',
    );
    expect(
      auditDiscovery(pages.slice(0, 1), [], policies, []).failures,
    ).toContain('Unreachable initial-HTML route: /tools/stl-viewer');
    expect(
      auditDiscovery(
        [...pages, page('/stl-viewer', '<main>obsolete</main>')],
        [],
        policies,
        [],
      ).failures,
    ).toContain('Obsolete artifact in current build/sitemap: /stl-viewer');
  });
  it('separates directory/navigation from contextual relationships and detects their removal', () => {
    const pages = [
      page(
        '/',
        '<nav><a href="/tools/stl-viewer">Global</a></nav><main><article class="tool-card"><a href="/tools/stl-viewer">Directory</a></article></main>',
      ),
      page(
        '/guides/source',
        '<main><p>Inspect placement in <a href="/tools/stl-viewer">the viewer</a>.</p></main>',
      ),
      page('/tools/stl-viewer', '<main>Viewer</main>'),
    ];
    expect(discoveryLinks(pages[0]).map((link) => link.kind)).toEqual([
      LinkKind.Navigation,
      LinkKind.Hub,
    ]);
    expect(
      auditDiscovery(pages, [], policies, ['/tools/stl-viewer']).rows[1]
        .contextualInlinks,
    ).toEqual(['/guides/source']);
    const failures = auditDiscovery(
      pages.filter((entry) => entry.route !== '/guides/source'),
      [],
      policies,
      ['/tools/stl-viewer'],
    ).failures;
    expect(failures).toContain(
      'Priority page has no contextual inbound content relationship: /tools/stl-viewer',
    );
  });
  it('detects a format tool removed from its hub even when global navigation still links it', () => {
    const pages = [
      page('/', '<nav><a href="/tools/stl-viewer">Viewer</a></nav>'),
      page('/tools/stl-tools', '<main>Hub missing its card</main>'),
      page(
        '/tools/stl-viewer',
        '<nav><a href="/tools/stl-tools">STL tools</a></nav>',
      ),
    ];
    expect(auditDiscovery(pages, [], policies, []).failures).toContain(
      'Format hub omits current tool: /tools/stl-tools -> /tools/stl-viewer',
    );
  });
  it('requires cross-format tools in the complete directory independently of global navigation', () => {
    const policies = routeSearchPolicy.filter((policy) =>
      ['/', '/tools', '/tools/3d-printer-fit-checker'].includes(policy.path),
    );
    const pages = [
      page('/', '<nav><a href="/tools/3d-printer-fit-checker">Fit</a></nav>'),
      page('/tools', '<main>Directory missing its fit tool</main>'),
      page('/tools/3d-printer-fit-checker', '<main>Fit</main>'),
    ];
    expect(auditDiscovery(pages, [], policies, []).failures).toContain(
      'Tool absent from complete initial-HTML directory: /tools/3d-printer-fit-checker',
    );
  });

  it('detects a guide hidden behind a search interaction', () => {
    const policy = routeSearchPolicy.find(
      (policy) => policy.path === '/guides/how-to-repair-an-stl-file',
    )!;
    const pages = [
      page('/', '<a href="/guides/how-to-repair-an-stl-file">Global</a>'),
      page('/guides', '<main><input type="search"></main>'),
      page(policy.path, '<main>Guide</main>'),
    ];
    expect(auditDiscovery(pages, [], [policy], []).failures).toContain(
      'Guide absent from unfiltered initial HTML: ' + policy.path,
    );
  });
  it('resolves bare fragments against the shared base and fails the wrong document', () => {
    const pages = [
      page('/', '<main>Home</main>'),
      page(
        '/examples',
        '<main><h2 id="sample">Sample</h2><a href="#sample">Jump</a></main>',
      ),
    ];
    expect(validateGeneratedPages(pages)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          originalUrl: '#sample',
          resolvedTarget: '/#sample',
        }),
      ]),
    );
  });
  it('rejects visible breadcrumb changes without matching schema', () => {
    const html =
      '<nav aria-label="Breadcrumb"><a href="/">Home</a><span aria-current="page">Viewer</span></nav><script type="application/ld+json">' +
      JSON.stringify({
        '@type': 'BreadcrumbList',
        itemListElement: [
          { name: 'Home', item: productionOrigin + '/', position: 1 },
          {
            name: 'Viewer',
            item: productionOrigin + '/tools/stl-viewer',
            position: 2,
          },
        ],
      }) +
      '</script>';
    expect(breadcrumbConsistency(page('/tools/stl-viewer', html))).toEqual([]);
    expect(
      breadcrumbConsistency(
        page('/tools/stl-viewer', html.replace('>Home<', '>Wrong parent<')),
      ),
    ).toEqual(['/tools/stl-viewer: visible breadcrumbs and JSON-LD differ']);
  });
});
