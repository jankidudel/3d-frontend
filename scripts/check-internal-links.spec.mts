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
      page('/guides', '', { canonical: SITE + '/stl-viewer' }),
      page('/stl-viewer', ''),
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
      routeForFile(outputDirectory, join(outputDirectory, 'stl-viewer.html')),
    ).toBe('/stl-viewer');
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
        { RouteStlSplitter: 'stl-splitter' },
        'split-guide.html',
      ),
    ).toBe('<a href="/stl-splitter?example=split-verification">Load</a>');
    expect(() =>
      resolveGuideLinks(
        '<a href="{{ GuideSlug.RouteStlSplitter }}?url=private">Load</a>',
        { RouteStlSplitter: 'stl-splitter' },
        'split-guide.html',
      ),
    ).toThrow('unresolved route placeholder');
  });
  it('resolves the existing repair route while retaining its anchor', () => {
    expect(
      resolveGuideLinks(
        '<a href="{{ GuideSlug.RouteStlRepair }}#remove-floating-parts">Review</a>',
        { RouteStlRepair: 'stl-repair' },
        'guide.html',
      ),
    ).toBe('<a href="/stl-repair#remove-floating-parts">Review</a>');
    expect(
      resolveGuideLinks(
        '<a href="{{GuideSlug.RouteStlRepair}}">Repair</a>',
        { RouteStlRepair: 'stl-repair' },
        'guide.html',
      ),
    ).toBe('<a href="/stl-repair">Repair</a>');
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
