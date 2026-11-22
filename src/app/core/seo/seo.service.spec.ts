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
      path: '/tools/stl-quality-checker',
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
      path: '/tools/stl-volume-calculator',
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
    ).toBe('https://tools.example.com/tools/stl-volume-calculator');
    expect(
      document.head
        .querySelector("meta[property='og:url']")
        ?.getAttribute('content'),
    ).toBe('https://tools.example.com/tools/stl-volume-calculator');
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
    ).toEqual([1, 2, 3]);
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

  describe('site identity and social previews', () => {
    const origin = 'https://tools.example.com';
    function setUp(): { service: SeoService; document: Document } {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: SEO_CONFIG,
            useValue: { indexingEnabled: true, siteUrl: origin },
          },
        ],
      });
      return {
        service: TestBed.inject(SeoService),
        document: TestBed.inject(DOCUMENT),
      };
    }
    function graph(document: Document): Record<string, unknown>[] {
      const text = document.head.querySelector(
        'script[data-seo-structured-data]',
      )?.textContent;
      const data = JSON.parse(text ?? '{}') as Record<string, unknown>;
      return (
        (data['@graph'] as Record<string, unknown>[] | undefined) ?? [data]
      );
    }
    function meta(document: Document, selector: string): string | null {
      return (
        document.head.querySelector(selector)?.getAttribute('content') ?? null
      );
    }

    it('adds the share image and large Twitter card on canonical pages', () => {
      const { service, document } = setUp();
      service.apply({
        title: 'Tools',
        description: 'All tools.',
        path: '/tools',
      });

      expect(meta(document, "meta[property='og:image']")).toBe(
        `${origin}/images/social/inspectmesh-share.png`,
      );
      expect(meta(document, "meta[property='og:image:width']")).toBe('1200');
      expect(meta(document, "meta[property='og:image:height']")).toBe('630');
      expect(meta(document, "meta[property='og:site_name']")).toBe(
        'InspectMesh',
      );
      expect(meta(document, "meta[name='twitter:card']")).toBe(
        'summary_large_image',
      );
    });

    it('declares Organization and WebSite on the home page only', () => {
      const { service, document } = setUp();
      service.apply({ title: 'Home', description: 'Home.', path: '/' });
      expect(graph(document).map((node) => node['@type'])).toEqual([
        'Organization',
        'WebSite',
      ]);

      service.apply({
        title: 'Tools',
        description: 'All tools.',
        path: '/tools',
      });
      expect(
        document.head.querySelector('script[data-seo-structured-data]'),
      ).toBeNull();
    });

    it('adds a WebApplication node to tool pages', () => {
      const { service, document } = setUp();
      service.apply({
        title: 'STL Viewer',
        description: 'Open an STL.',
        path: '/tools/stl-viewer',
      });
      const node = graph(document).find(
        (item) => item['@type'] === 'WebApplication',
      );
      expect(node?.['name']).toBe('Free STL Viewer Online');
      expect(node?.['url']).toBe(`${origin}/tools/stl-viewer`);
    });

    it('adds the canonical URL and publisher to Article nodes without dates', () => {
      const { service, document } = setUp();
      service.apply({
        title: 'Guide',
        description: 'Guide description.',
        path: '/guides/example',
        structuredData: {
          '@context': 'https://schema.org',
          '@graph': [{ '@type': 'Article', headline: 'Guide' }],
        },
      });
      const article = graph(document)[0];
      expect(article['url']).toBe(`${origin}/guides/example`);
      expect(article['mainEntityOfPage']).toBe(`${origin}/guides/example`);
      expect(article['publisher']).toEqual(
        expect.objectContaining({ name: 'InspectMesh' }),
      );
      expect('datePublished' in article).toBe(false);
      expect('dateModified' in article).toBe(false);
    });

    it('omits the share image and identity nodes without a canonical URL', () => {
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
      service.apply({ title: 'Home', description: 'Home.', path: '/' });

      expect(
        document.head.querySelector("meta[property='og:image']"),
      ).toBeNull();
      expect(
        document.head.querySelector('script[data-seo-structured-data]'),
      ).toBeNull();
    });
  });
});
