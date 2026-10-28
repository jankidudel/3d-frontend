import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SEO_CONFIG } from './seo-config';
import { SeoService } from './seo.service';
import { breadcrumbsForPath } from './breadcrumbs';

describe('SeoService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('keeps a temporary deployment out of search and has no canonical', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SEO_CONFIG,
          useValue: { indexingEnabled: false, siteUrl: '' },
        },
      ],
    });
    const service = TestBed.inject(SeoService);
    const document = TestBed.inject(DOCUMENT);

    service.apply({
      title: 'STL Quality Checker',
      description: 'Checks STL topology.',
      path: '/stl-quality-checker',
    });

    expect(document.title).toBe('STL Quality Checker');
    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute('content'),
    ).toBe('Checks STL topology.');
    expect(
      document.head
        .querySelector('meta[name="robots"]')
        ?.getAttribute('content'),
    ).toBe('noindex, nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it('uses the configured HTTPS custom domain for production canonicals', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SEO_CONFIG,
          useValue: {
            indexingEnabled: true,
            siteUrl: 'https://tools.example.com',
          },
        },
      ],
    });
    const service = TestBed.inject(SeoService);
    const document = TestBed.inject(DOCUMENT);

    service.apply({
      title: 'STL Volume Calculator',
      description: 'Calculates STL volume.',
      path: '/stl-volume-calculator',
    });

    expect(
      document.head
        .querySelector('meta[name="robots"]')
        ?.getAttribute('content'),
    ).toBe('index, follow');
    expect(
      document.head
        .querySelector('link[rel="canonical"]')
        ?.getAttribute('href'),
    ).toBe('https://tools.example.com/stl-volume-calculator');
    expect(
      document.head
        .querySelector("meta[property='og:url']")
        ?.getAttribute('content'),
    ).toBe('https://tools.example.com/stl-volume-calculator');
  });

  it('adds FAQ structured data for an article page', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SEO_CONFIG,
          useValue: {
            indexingEnabled: true,
            siteUrl: 'https://tools.example.com',
          },
        },
      ],
    });
    const service = TestBed.inject(SeoService);
    const document = TestBed.inject(DOCUMENT);

    service.apply({
      title: 'Guide',
      description: 'Guide description.',
      path: '/guide',
      openGraphType: 'article',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
      },
    });

    expect(
      document.head
        .querySelector("meta[property='og:type']")
        ?.getAttribute('content'),
    ).toBe('article');
    expect(
      document.head.querySelector('script[data-seo-structured-data]')
        ?.textContent,
    ).toBe('{"@context":"https://schema.org","@type":"FAQPage"}');
  });

  it('fails closed when indexing is enabled without a valid HTTPS site URL', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SEO_CONFIG,
          useValue: { indexingEnabled: true, siteUrl: 'http://example.com' },
        },
      ],
    });
    const service = TestBed.inject(SeoService);
    const document = TestBed.inject(DOCUMENT);

    service.apply({ title: 'Home', description: 'Home page.', path: '/' });

    expect(
      document.head
        .querySelector('meta[name="robots"]')
        ?.getAttribute('content'),
    ).toBe('noindex, nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });

  it('adds one BreadcrumbList while preserving existing page schema', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SEO_CONFIG,
          useValue: {
            indexingEnabled: true,
            siteUrl: 'https://www.inspectmesh.com',
          },
        },
      ],
    });
    const service = TestBed.inject(SeoService);
    const document = TestBed.inject(DOCUMENT);

    service.apply({
      title: 'Guide',
      description: 'Guide description.',
      path: '/guides/how-to-repair-an-stl-file',
      structuredData: {
        '@context': 'https://schema.org',
        '@graph': [{ '@type': 'Article' }, { '@type': 'FAQPage' }],
      },
    });
    service.setBreadcrumbs(
      breadcrumbsForPath('/guides/how-to-repair-an-stl-file'),
    );

    const graph = JSON.parse(
      document.head.querySelector('script[data-seo-structured-data]')
        ?.textContent ?? '',
    )['@graph'];
    expect(graph.map((item: { '@type': string }) => item['@type'])).toEqual([
      'Article',
      'FAQPage',
      'BreadcrumbList',
    ]);
    expect(
      graph[2].itemListElement.map(
        (item: { position: number }) => item.position,
      ),
    ).toEqual([1, 2]);
  });

  it('marks an error page as noindex and removes an existing canonical URL', () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: SEO_CONFIG,
          useValue: {
            indexingEnabled: true,
            siteUrl: 'https://tools.example.com',
          },
        },
      ],
    });
    const service = TestBed.inject(SeoService);
    const document = TestBed.inject(DOCUMENT);

    service.apply({ title: 'Home', description: 'Home page.', path: '/' });
    service.applyNoIndex('Page Not Found', 'The page could not be found.');

    expect(document.title).toBe('Page Not Found');
    expect(
      document.head
        .querySelector('meta[name="description"]')
        ?.getAttribute('content'),
    ).toBe('The page could not be found.');
    expect(
      document.head
        .querySelector('meta[name="robots"]')
        ?.getAttribute('content'),
    ).toBe('noindex, nofollow');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
