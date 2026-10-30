import { resolveGuideLinks } from './internal-guide-links.mts';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  routeForFile,
  validateGeneratedPages,
  type GeneratedPage,
} from './check-internal-links.mts';

const SITE = 'https://www.inspectmesh.com';

function page(
  route: string,
  body: string,
  options: { canonical?: string; filePath?: string } = {},
): GeneratedPage {
  return {
    filePath: options.filePath ?? route + '/index.html',
    route,
    html:
      '<!doctype html><head><link rel="canonical" href="' +
      (options.canonical ?? SITE + route) +
      '"></head><body>' +
      body +
      '</body>',
  };
}

describe('internal link validation', () => {
  it('accepts root-relative and relative links with trailing slashes, queries and anchors', () => {
    const failures = validateGeneratedPages([
      page('/', '<a href="/guides/">Guides</a>'),
      page(
        '/guides',
        '<h2 id="stl"></h2><a href="../guides?source=nav#stl">STL guides</a>',
      ),
    ]);

    expect(failures).toEqual([]);
  });

  it('resolves fragments against the document base and requires a unique target', () => {
    const examples = page(
      '/examples',
      '<base href="/"><a href="#section">Jump</a><h2 id="section">Section</h2>',
    );
    expect(validateGeneratedPages([page('/', ''), examples])).toEqual([
      expect.objectContaining({
        resolvedTarget: '/#section',
        reason: 'anchor not found',
      }),
    ]);
    expect(
      validateGeneratedPages([
        page('/', ''),
        {
          ...examples,
          html: examples.html.replace(
            'href="#section"',
            'href="/examples#section"',
          ),
        },
      ]),
    ).toEqual([]);
    expect(
      validateGeneratedPages([
        page('/', '<a href="#same">Jump</a><p id="same"></p><p id="same"></p>'),
      ]),
    ).toHaveLength(1);
  });

  it('reports a generated page that is missing', () => {
    const failures = validateGeneratedPages([
      page('/', '<a href="/missing">Missing</a>'),
    ]);

    expect(failures).toEqual([
      expect.objectContaining({
        originalUrl: '/missing',
        resolvedTarget: '/missing',
        reason: 'generated page not found',
      }),
    ]);
  });

  it('reports a missing anchor on an existing generated page', () => {
    const failures = validateGeneratedPages([
      page('/', '<a href="/guides#missing">Missing anchor</a>'),
      page('/guides', '<h2 id="stl"></h2>'),
    ]);

    expect(failures).toEqual([
      expect.objectContaining({
        originalUrl: '/guides#missing',
        resolvedTarget: '/guides#missing',
        reason: 'anchor not found',
      }),
    ]);
  });

  it('ignores external, non-navigation and download links while resolving same-page fragments', () => {
    const failures = validateGeneratedPages([
      page(
        '/',
        '<a href="https://example.com">External</a>' +
          '<a href="mailto:hello@example.com">Mail</a>' +
          '<a href="tel:+441234">Call</a>' +
          '<a href="javascript:void(0)">Script</a>' +
          '<a href="data:text/plain,hello">Data</a>' +
          '<h2 id="here">Target</h2><a href="#here">Fragment</a>' +
          '<a href="/file.pdf" download>Download</a>',
      ),
    ]);

    expect(failures).toEqual([]);
  });

  it('rejects localhost and CloudFront targets', () => {
    const failures = validateGeneratedPages([
      page(
        '/',
        '<a href="http://localhost:4200/guides">Local</a>' +
          '<a href="https://abc.cloudfront.net/guides">Development</a>',
      ),
    ]);

    expect(failures).toHaveLength(2);
    expect(failures.every((item) => item.reason.includes('development'))).toBe(
      true,
    );
  });

  it('rejects duplicate and mismatched canonical URLs', () => {
    const failures = validateGeneratedPages([
      page('/guides', '', { canonical: SITE + '/tools/stl-viewer' }),
      page('/tools/stl-viewer', ''),
    ]);

    expect(failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: 'canonical URL does not match its generated page',
        }),
        expect.objectContaining({
          reason: expect.stringContaining('duplicate canonical URL'),
        }),
      ]),
    );
  });

  it('maps both supported generated route layouts', () => {
    const outputDirectory = join('/tmp', 'inspectmesh-output');

    expect(
      routeForFile(
        outputDirectory,
        join(outputDirectory, 'guides', 'index.html'),
      ),
    ).toBe('/guides');
    expect(
      routeForFile(
        outputDirectory,
        join(outputDirectory, 'tools', 'stl-viewer.html'),
      ),
    ).toBe('/tools/stl-viewer');
    expect(
      routeForFile(outputDirectory, join(outputDirectory, 'index.html')),
    ).toBe('/');
  });
});

describe('registered guide links with section fragments', () => {
  it('resolves an explicit example selection without leaving template text in public links', () => {
    expect(
      resolveGuideLinks(
        '<a href="{{ GuideSlug.RouteStlSplitter }}?example=split-verification">Load</a>',
        { RouteStlSplitter: 'tools/stl-splitter' },
        'split-guide.html',
      ),
    ).toBe('<a href="/tools/stl-splitter?example=split-verification">Load</a>');
    expect(() =>
      resolveGuideLinks(
        '<a href="{{ GuideSlug.RouteStlSplitter }}?url=private">Load</a>',
        { RouteStlSplitter: 'tools/stl-splitter' },
        'split-guide.html',
      ),
    ).toThrow('unresolved route placeholder');
  });
  it('resolves the existing repair route while retaining its anchor', () => {
    expect(
      resolveGuideLinks(
        '<a href="{{ GuideSlug.RouteStlRepair }}#remove-floating-parts">Review</a>',
        { RouteStlRepair: 'tools/stl-repair' },
        'guide.html',
      ),
    ).toBe('<a href="/tools/stl-repair#remove-floating-parts">Review</a>');
    expect(
      resolveGuideLinks(
        '<a href="{{GuideSlug.RouteStlRepair}}">Repair</a>',
        { RouteStlRepair: 'tools/stl-repair' },
        'guide.html',
      ),
    ).toBe('<a href="/tools/stl-repair">Repair</a>');
  });
  it('rejects an unknown owner even with an anchor', () => {
    expect(() =>
      resolveGuideLinks(
        '<a href="{{ GuideSlug.Unknown }}#part">x</a>',
        {},
        'guide.html',
      ),
    ).toThrow('unknown internal route');
  });
});

it('diagnoses a broken material evidence target using the actual document pathname', () => {
  const pages = [
    page(
      '/',
      '<base href="/"><a href="/materials/nylon#product-evidence">Named PA11 evidence</a>',
    ),
    page(
      '/materials/nylon',
      '<base href="/"><section id="product-evidence">PA11 evidence</section>',
    ),
  ];
  expect(validateGeneratedPages(pages)).toEqual([]);
  pages[1] = page('/materials/nylon', '<main>Evidence anchor removed</main>');
  expect(validateGeneratedPages(pages)).toContainEqual(
    expect.objectContaining({
      resolvedTarget: '/materials/nylon#product-evidence',
      reason: 'anchor not found',
    }),
  );
});

it('keeps encoded, named and duplicate fragment diagnostics after releasing page DOMs', () => {
  const failures = validateGeneratedPages([
    page(
      '/',
      '<a href="/target#named">Named</a><a href="/target#same">Same element</a>' +
        '<a href="/target#two">Duplicate</a><a href="/target#caf%C3%A9">Encoded</a>' +
        '<a href="/target#%E0%A4">Malformed</a><a href="http://[">Invalid URL</a>' +
        '<area href="/missing">',
    ),
    page(
      '/target',
      '<a name="named"></a><a id="same" name="same"></a>' +
        '<p id="two"></p><a name="two"></a><h2 id="café">Target</h2>',
    ),
  ]);
  expect(
    failures.map(({ originalUrl, reason }) => ({ originalUrl, reason })),
  ).toEqual([
    { originalUrl: '/target#two', reason: 'anchor not found' },
    { originalUrl: '/target#%E0%A4', reason: 'anchor not found' },
    { originalUrl: 'http://[', reason: 'URL is invalid' },
    { originalUrl: '/missing', reason: 'generated page not found' },
  ]);
});
