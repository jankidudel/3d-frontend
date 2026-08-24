import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { SEO_CONFIG } from './seo-config';
import { SeoService } from './seo.service';

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
});
